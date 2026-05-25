variable "aws_region" {
  type        = string
  description = "AWS region to deploy resources"
  default     = "eu-north-1" # Stockholm region - close to SMHI!
}

variable "project_name" {
  type        = string
  description = "Name of the project"
  default     = "smhi-weather-tracker"
}

variable "environment" {
  type        = string
  description = "Deployment environment (e.g. dev, staging, prod)"
  default     = "production"
}

variable "container_port" {
  type        = number
  description = "Port exposed by the FastAPI container"
  default     = 8000
}
