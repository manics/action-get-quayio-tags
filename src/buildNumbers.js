const semverValid = require('semver/functions/valid')

/**
 * Checks whether a tag has the form MAJOR.MINOR.PATCH-BUILDNUMBER
 * where are part are integers
 *
 * @param {string} version The version you want to find tags for
 * @param {string} tag The image tag
 * @returns true if tag is of the form version-BUILDNUMBER, false otherwise
 */
function _tagMatches(version, tag) {
  if (!tag.startsWith(`${version}-`)) return false
  const parts = tag.split('-')
  if (parts.length !== 2 || parts[1].match(/^\d+$/)) {
    console.error(`Invalid build number, ignoring tag ${tag}`)
    return false
  }
  return true
}

/**
 * Fetch all quay.io tags containing a string
 *
 * @param {string} quayIoRepo The quay.io repository
 * @param {string} version Find all tags containing this semver version
 * @returns {Array<string>} Matching tags
 */
async function _getAllMatches(quayIoRepo, version) {
  if (!semverValid(version)) {
    throw new Error(`Invalid semver: ${version}`)
  }
  const r = await fetch(
    `https://quay.io/api/v1/repository/${quayIoRepo}/tag/?filter_tag_name=like:${version}`
  )
  const tags = await r.json()
  if (tags.has_additional) {
    throw new Error('Paging required to fetch all tags, not implemented!')
  }
  if (tags.length === 0) {
    return []
  }

  // filter_tag_name returns matches anywhere in the tag
  // tags should be of the form major.minor.patch-index
  // where version == major.minor.patch
  const tagNames = tags.tags.map(tag => tag.name)
  console.log(tagNames)
  const matches = tagNames.filter(tagName => _tagMatches(version, tagName))
  return matches
}

/**
 * Return the largest build number of the tags
 * Caller must ensure that tags are of the form MAJOR.MINOR.PATCH-BUILDNUMBER
 *
 * @param {Array<string>} tags List of tag names
 * @returns The maximum build number
 */
function _getMaxBuildNumber(tags) {
  const buildNumbers = tags.map(tag => parseInt(tag.split('-')[1]))
  buildNumbers.sort()
  return buildNumbers.slice(-1)
}

/**
 * Find all tags with build-numbers for `version`, return the next build-number
 *
 * @param {string} quayIoRepo The quay.io repositroy in form OWNER/NAME
 * @param {string} version The current semver version
 * @returns The next build number, or 0 if no existing build-numbers exist for version
 */
async function nextBuildNumber(quayIoRepo, version) {
  const matches = await _getAllMatches(quayIoRepo, version)
  if (matches.length) {
    const b = _getMaxBuildNumber(matches)
    return b + 1
  }
  return 0
}

module.exports = { nextBuildNumber }
