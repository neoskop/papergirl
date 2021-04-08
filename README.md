# Papergirl

A fault-tolerant delivery tier with S3

## Quickstart

### KinD

```sh
$ scripts/quickstart.sh
```

### Docker Compose

```sh
$ docker-compose up
# Other terminal
$ nats papergirl '{"foo":"bar"}'
```

### Helm

You can either checkout the repository and use the Helm chart files directly i.e.:

```sh
$ helm install papergirl ./helm
```

Or you can use our Helm repository:

```sh
$ helm repo add neoskop https://charts.neoskop.dev
$ helm install papergirl neoskop/papergirl
```

## Architecture

Papergirl depends on number of services:

1. An NATS queue is used to signal that a website changed
2. The built static website must be stored on S3 compatible storage

The general workflow is:

1. Papergirl fetches the site from the configured S3 bucket initially
2. Papergirl will then start listening for messages to a defined NATS queue
3. When a signal is received Papergirl will fetch the contents of the S3 bucket again and replace it locally
4. Papergirl creates nightly backups of the main S3 bucket to another bucket
5. In case of a build failure the delivery tier can be switched to the backup
