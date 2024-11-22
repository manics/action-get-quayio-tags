const semverValid = require('semver/functions/valid')

async function _requestJson(url) {
  console.debug(`Fetching ${url}`)
  const r = await fetch(url)
  const response = await r.json()
  console.debug(response)
  return response
}

/**
 * Checks whether a tag has the form VERSION-BUILDNUMBER
 *
 * @param {string} version The version you want to find tags for
 * @param {string} tag The image tag
 * @returns true if tag is of the form VERSION-BUILDNUMBER, false otherwise
 */
function _tagMatches(version, tag) {
  const prefix = `${version}-`
  if (!tag.startsWith(prefix)) return false
  const build = tag.substring(prefix.length)
  if (!build.match(/^\d+$/)) {
    console.error(`Invalid build number ${build}, ignoring tag ${tag}`)
    return false
  }
  return true
}

/**
 * @param {string} quayIoRepo The quay.io repository
 * @param {string} version Find all tags containing this semver version)
 */
async function _getTags(quayIoRepo, version) {
  const tags = []
  const filter = version ? `&filter_tag_name=like:${version}` : ''
  let response = null
  let page = 0
  while (response == null || response.has_additional) {
    page++
    // https://docs.quay.io/api/swagger/#!/tag/listRepoTags
    const url = `https://quay.io/api/v1/repository/${quayIoRepo}/tag/?page=${page}${filter}`
    response = await _requestJson(url)
    tags.push(...response.tags.map(tag => tag.name))
  }
  return tags
}

/**
 * Fetch all quay.io tags containing a version
 *
 * @param {string} quayIoRepo The quay.io repository
 * @param {string} version Find all tags containing this semver version
 * @param {bool} strict If true (default) the version must be MAJOR.MINOR.PATCH, otherwise it
 *        can be anything and no checking is performed.
 * @returns {Array<string>} Matching tags
 */
async function getAllMatches(quayIoRepo, version, strict = true) {
  if (version && (!semverValid(version) || !version.match(/^\d+\.\d+\.\d+$/))) {
    if (strict) {
      throw new Error(`Invalid version, must be MAJOR.MINOR.PATCH: ${version}`)
    }
    console.warn(
      `${version} is not MAJOR.MINOR.PATCH, allowing since strict=false`
    )
  }
  const tagNames = await _getTags(quayIoRepo, version)
  if (!version) {
    return tagNames
  }

  // filter_tag_name returns matches anywhere in the tag
  // tags should be of the form MAJOR.MINOR.PATCH-BUILDNUMBER
  // where version == MAJOR.MINOR.PATCH
  const matches = tagNames.filter(tagName => _tagMatches(version, tagName))
  console.debug(`Matching tags: ${matches}`)
  return matches
}

/**
 * Return the next build-number, by comparing the last `*-N` component for all tags
 *
 * @param {Array<string>} tags A list of matching tags with build numbers, from getAllMatches()
 * @returns The next build number, or 0 if no existing build-numbers exist for version
 */
function nextBuildNumber(version, tags) {
  const matches = tags.filter(tagName => _tagMatches(version, tagName))
  if (!matches.length) {
    return 0
  }
  const buildNumbers = matches.map(tag => parseInt(tag.split('-').slice(-1)[0]))
  // sort() is lexicographic by default
  buildNumbers.sort((a, b) => a - b)
  const b = buildNumbers.slice(-1)[0]
  return b + 1
}

module.exports = { getAllMatches, nextBuildNumber }
