# Papergirl

A fault-tolerant delivery tier with S3 for Kubernetes

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

## Configuration

To configure the specific behaviour of Papergirl you can add the file `papergirl.yaml` oder `papergirl.json` into the root directory of the S3 bucket. You can configure the following settings:

### Image Processing

You can make use of [Caravaggio](https://caravaggio.ramielcreations.com/docs/general-usage) with the following settings to resize and recompress images:

| Name                        | Description                                  | Default    |
| --------------------------- | -------------------------------------------- | ---------- |
| `imageProcessing.enabled`   | Enables the resizing of Images               | `false`    |
| `imageProcessing.quality`   | Quality of compression                       | `85`       |
| `imageProcessing.imageType` | Output type, either `'original'` or `'auto'` | 'original' |

If `imageProcessing.enabled` is set to `true`, you can resize an image with the name `/example.jpg` like so:

1. Resizing to specific width and height of 200x200px: `/example-200x200.jpg`
2. Resizing to specific width of 200px: `/example-200w.jpg`
3. Resizing to specific height of 200px: `/example-200h.jpg`

### Cache

When setting `cache.headers` to `true` (the default value is `true` as well), `Expires`-Headers are added to static files automatically.

### Redirects

If `removeTrailingSlash` is set to `true` (and per default it is), URLs ending with a `/` are automatically redirected to the same URL without `/` via a 301 redirect.

To define redirects for specific URLs you can add Entries under `redirects` with the following properties:

| Name    | Description                                           | Default |
| ------- | ----------------------------------------------------- | ------- |
| `from`  | The source URL                                        | -       |
| `to`    | The redirect target URL                               | -       |
| `regex` | Boolean to denote if to match via regular expressions | `false` |
| `code`  | The code to redirect with (301, 302 or 307)           | `'301'` |

### Security

You can set the following properties to influence security related response headers:

| Name                       | Default                |
| -------------------------- | ---------------------- |
| `security.csp`             | `"default-src 'none'"` |
| `security.standardHeaders` | `true`                 |
| `security.hideVersion`     | `true`                 |

- `security.csp` defines the content of the `Content-Security-Policy` header. Any CSP3 nonce is automatically replaced upon each request.
- `security.standardHeaders` when `true` will enforce secure defaults for `X-Frame-Options`, `X-XSS-Protection`, `X-Content-Type-Options` and `Referrer-Policy` headers
- `security.hideVersion` when `true` will hide server tokens
