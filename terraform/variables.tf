variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type        = string
  description = "GCP region for Cloud Run and storage"
  default     = "europe-north1"
}

variable "project_name" {
  type        = string
  description = "Application name used for resource naming"
  default     = "smhi-weather-tracker"
}

variable "environment" {
  type        = string
  description = "Deployment environment"
  default     = "production"
}

variable "gemini_api_key" {
  type        = string
  description = "Gemini API key for AI forecast generation"
  sensitive   = true
  default     = ""
}
