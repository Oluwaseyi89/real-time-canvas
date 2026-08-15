package storage

import (
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// S3Config holds everything needed to talk to S3 or an S3-compatible
// service (MinIO, Cloudflare R2, etc). Endpoint is optional — leave it
// empty to talk to real AWS S3.
type S3Config struct {
	Bucket          string
	Region          string
	Endpoint        string // custom endpoint for S3-compatible services; empty = real AWS S3
	AccessKeyID     string
	SecretAccessKey string
	UsePathStyle    bool   // required by most non-AWS S3-compatible services
	PublicURLBase   string // overrides the derived public URL, e.g. a CDN domain in front of the bucket
}

// S3Storage uploads to an S3 (or S3-compatible) bucket.
type S3Storage struct {
	client        *s3.Client
	bucket        string
	publicURLBase string // always non-empty; derived from endpoint/region if not overridden
}

// NewS3Storage builds an S3 client from cfg. It does not verify the bucket
// exists or is reachable — that surfaces on the first real Upload call, at
// which point config.Load's caller (main.go) has already logged which
// backend was selected.
func NewS3Storage(ctx context.Context, cfg S3Config) (*S3Storage, error) {
	if cfg.Bucket == "" {
		return nil, fmt.Errorf("S3 bucket is required")
	}

	region := cfg.Region
	if region == "" {
		region = "us-east-1"
	}

	loadOpts := []func(*awsconfig.LoadOptions) error{
		awsconfig.WithRegion(region),
	}
	if cfg.AccessKeyID != "" && cfg.SecretAccessKey != "" {
		loadOpts = append(loadOpts, awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(cfg.AccessKeyID, cfg.SecretAccessKey, ""),
		))
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, loadOpts...)
	if err != nil {
		return nil, fmt.Errorf("load AWS config: %w", err)
	}

	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		if cfg.Endpoint != "" {
			o.BaseEndpoint = aws.String(cfg.Endpoint)
		}
		o.UsePathStyle = cfg.UsePathStyle
	})

	publicURLBase := strings.TrimSuffix(cfg.PublicURLBase, "/")
	if publicURLBase == "" {
		publicURLBase = derivePublicURLBase(cfg)
	}

	return &S3Storage{
		client:        client,
		bucket:        cfg.Bucket,
		publicURLBase: publicURLBase,
	}, nil
}

// derivePublicURLBase constructs a default public URL prefix from the
// endpoint/region/bucket when the caller hasn't set S3_PUBLIC_URL_BASE
// explicitly (e.g. because a CDN sits in front of the bucket instead).
func derivePublicURLBase(cfg S3Config) string {
	if cfg.Endpoint != "" {
		endpoint := strings.TrimSuffix(cfg.Endpoint, "/")
		if cfg.UsePathStyle {
			return endpoint + "/" + cfg.Bucket
		}
		// Virtual-hosted style: bucket becomes a subdomain of the endpoint host.
		endpoint = strings.TrimPrefix(strings.TrimPrefix(endpoint, "https://"), "http://")
		return "https://" + cfg.Bucket + "." + endpoint
	}
	return fmt.Sprintf("https://%s.s3.%s.amazonaws.com", cfg.Bucket, cfg.Region)
}

func (s *S3Storage) Upload(ctx context.Context, key string, reader io.Reader, size int64, contentType string) (string, error) {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        aws.String(s.bucket),
		Key:           aws.String(key),
		Body:          reader,
		ContentLength: aws.Int64(size),
		ContentType:   aws.String(contentType),
	})
	if err != nil {
		return "", fmt.Errorf("s3 put object: %w", err)
	}

	return s.publicURLBase + "/" + key, nil
}
