output "cloud_run_url" {
  value       = google_cloud_run_v2_service.api.uri
  description = "Direct URL for the Cloud Run backend API"
}

output "frontend_bucket_url" {
  value       = "https://storage.googleapis.com/${google_storage_bucket.frontend.name}/index.html"
  description = "Direct GCS URL for the frontend (use CDN URL in production)"
}

output "load_balancer_ip" {
  value       = google_compute_global_address.default.address
  description = "Global static IP for the HTTPS load balancer"
}

output "artifact_registry" {
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.api.repository_id}"
  description = "Artifact Registry path for docker push"
}
