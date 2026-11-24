#!/bin/bash
set -e

echo "=========================================="
echo " Madtech Solutions - Mad Invoice AWS Deploy"
echo "=========================================="

# 1. Configure 2GB Swap Memory (Prevent OOM on t3.micro 1GB RAM)
if [ ! -f /swapfile ]; then
    echo "Configuring 2GB swap memory..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "Swap configured successfully."
else
    echo "Swap already configured."
fi

# 2. Update packages and install Docker + Docker Compose
echo "Installing Docker prerequisites..."
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg git

if ! command -v docker &> /dev/null; then
    echo "Installing Docker Engine..."
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo usermod -aG docker $USER
    echo "Docker installed."
fi

# 3. Create .env if not exists
if [ ! -f .env ]; then
    echo "Creating .env from .env.production.example..."
    cp .env.production.example .env
fi

# 4. Build and start containers
echo "Starting Mad Invoice containers..."
sudo docker compose -f docker-compose.prod.yml up -d --build

echo "=========================================="
echo " Deployment Complete!"
echo " Mad Invoice is running at: http://$(curl -s http://checkip.amazonaws.com)"
echo "=========================================="
