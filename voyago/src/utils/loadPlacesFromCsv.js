const DEFAULT_IMAGE_URL =
  'https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=1400&q=80'

function toNumber(value, fallback) {
  const parsed = Number(value)
  if (Number.isFinite(parsed)) {
    return parsed
  }
  return fallback
}

export async function loadPlacesFromCsv(csvPath) {
  const response = await fetch(csvPath)
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status}`)
  }

  const csvText = await response.text()
  const rows = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (rows.length < 2) {
    return []
  }

  const headers = rows[0].split(',').map((header) => header.trim())
  const dataRows = rows.slice(1)

  return dataRows
    .map((row, index) => {
      const values = row.split(',').map((value) => value.trim())
      const rawItem = headers.reduce((item, header, headerIndex) => {
        item[header] = values[headerIndex] ?? ''
        return item
      }, {})

      return {
        id: rawItem.id || `${rawItem.name || 'place'}-${index + 1}`,
        name: rawItem.name || 'Unknown Place',
        country: rawItem.country || 'Unknown Country',
        description: rawItem.description || 'No description yet.',
        bestSeason: rawItem.bestSeason || 'Any season',
        budgetLevel: rawItem.budgetLevel || 'Unknown',
        avgDailyCost: toNumber(rawItem.avgDailyCost, 0),
        daysSuggested: toNumber(rawItem.daysSuggested, 2),
        imageUrl: rawItem.imageUrl || DEFAULT_IMAGE_URL,
      }
    })
    .filter((place) => Boolean(place.name))
}
