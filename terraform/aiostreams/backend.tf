terraform {
  backend "s3" {
    bucket                      = "opentofu-state"
    key                         = "homelab/terraform.tfstate"
    region                      = "main"
    endpoint                    = "http://ratmachine:9000"
    force_path_style            = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
  }
}
