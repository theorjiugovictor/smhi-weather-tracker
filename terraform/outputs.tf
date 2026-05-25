output "cloudfront_domain_name" {
  value       = aws_cloudfront_distribution.cdn.domain_name
  description = "The domain name of the CloudFront CDN distribution serving the React app and API"
}

output "ecr_repository_url" {
  value       = aws_ecr_repository.api.repository_url
  description = "The registry URL of the ECR repository for the backend image"
}

output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "The public DNS name of the API Application Load Balancer"
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.frontend.id
  description = "The name of the S3 bucket hosting static frontend files"
}
