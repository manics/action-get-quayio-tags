# action-get-quayio-tags

[![GitHub Super-Linter](https://github.com/manics/action-get-quayio-tags/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/manics/action-get-quayio-tags/actions/workflows/ci.yml/badge.svg)

A GitHub Action to fetch quay.io container image tags, and to generate build
numbers.

## When to use this

Use this when you want to tag a container image with the version of the
application contained within, but want the ability to rebuild the image without
having to make a new release of the application.

For example, if the most recent release in `quay.io/jupyterhub/jupyterhub` is
tagged `5.2.1-0` and the image is being rebuilt with the same JupyterHub version
`5.2.1` this action would return `1` as the next `buildNumber`, i.e. the image
should be tagged `5.2.1-1`. The next rebuild would set `buildNumber` to `2`.

If a new release `5.2.2` was made the `buildNumber` would be `0`, i.e. tag
`5.2.2-0`.

## Automatically create latest and SemVer tags

Pass the outputs of this action to
[action-major-minor-tag-calculator#354](https://github.com/jupyterhub/action-major-minor-tag-calculator/pull/354):

> [!WARNING]
>
> The default configuration assumes the current branch is always building the
> most recent version of the application (i.e. it should be tagged `latest`,
> `MAJOR`, `MAJOR.MINOR`, `MAJOR.MINOR.PATCH`). This is to reduce the number of
> `quay.io` API calls to fetch the relevant tags.
>
> If you are building an older release such as `4.0.0` you must set
> `allTags: "true"` to fetch _all_ tags so that
> `action-major-minor-tag-calculator` can work out whether to set the major,
> minor and patch aliases.

## Example

```yaml
env:
  IMAGE: jupyterhub/jupyterhub
  REGISTRY: quay.io
  LATEST_BRANCH: main
  APP_VERSION: 5.0.0

steps:
  - name: Checkout
    id: checkout
    uses: actions/checkout@v4

  - name: Get build-number by looking at existing tags
    id: quayio
    uses: manics/action-get-quayio-tags@main
    with:
      repository: ${{ env.IMAGE }}
      version: ${{ env.APP_VERSION }}
      # If this is not LATEST_BRANCH, nor is it a pull request against
      # LATEST_BRANCH assume it's a backport branch which means we need to get
      # all tags to work out which MAJOR and MAJOR.MINOR aliases are needed.
      allTags:
        ${{ (github.ref != format('refs/heads/{0}', env.LATEST_BRANCH)) &&
        (github.base_ref != format('refs/heads/{0}', env.LATEST_BRANCH)) }}
      strict: 'true'

  - name: Setup push rights to registry
    run: >-
      docker login -u "${{ secrets.QUAY_USERNAME }}"
        -p "${{ secrets.QUAY_PASSWORD }}" "${{ env.REGISTRY }}"

  - name: Calculate tags
    id: imagetags
    uses: manics/action-major-minor-tag-calculator@allow-external-tag
    with:
      tagList: ${{ steps.quayio.outputs.tags }}
      currentTag: ${{ env.APP_VERSION }}-${{ steps.quayio.outputs.buildNumber }}
      prefix: >-
        ${{ env.REGISTRY }}${{ env.IMAGE }}:

  - name: Print tags
    run: |
      echo "Image tags: ${{ steps.imagetags.outputs.tags }}"

  - name: Build and push
    uses: docker/build-push-action@v6
    with:
      push: true
      # tags parameter must be a string input so convert `gettags` JSON
      # array into a comma separated list of tags
      tags: ${{ join(fromJson(steps.jupyterhubtags.outputs.tags)) }}
```

## Development

[Node.js](https://nodejs.org) 20 or later is required.

1. :hammer_and_wrench: Install the dependencies

   ```bash
   npm install
   ```

1. :building_construction: Package the JavaScript for distribution

   ```bash
   npm run bundle
   ```

1. :white_check_mark: Run the tests

   ```bash
   npm test
   ```

1. You can also run all steps with one command

   ```bash
   npm run all
   ```

> [!NOTE]
>
> The `bundle` step is important! It will run
> [`ncc`](https://github.com/vercel/ncc) to build the final JavaScript action
> code with all dependencies included.
