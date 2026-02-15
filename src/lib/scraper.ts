import 'server-only'
import * as cheerio from 'cheerio'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function scrapeFnacPrice(query: string): Promise<number | null> {
    try {
        const searchUrl = `https://www.fnac.com/SearchResult/ResultList.aspx?Search=${encodeURIComponent(query)}`

        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            },
        })

        if (!response.ok) {
            console.error(`Fnac scraping failed: ${response.status}`)
            return null
        }

        const html = await response.text()
        const $ = cheerio.load(html)

        // Fnac price selectors (may need adjustment based on actual HTML structure)
        // Common patterns: .f-priceBox__price, .price, [data-price]
        const priceText = $('.f-priceBox__price').first().text().trim() ||
            $('.Article-itemPrice').first().text().trim() ||
            $('[itemprop="price"]').first().attr('content')

        if (!priceText) return null

        // Extract numeric value from "29,99 €" or "29.99"
        const priceMatch = priceText.match(/[\d,\.]+/)
        if (!priceMatch) return null

        const price = parseFloat(priceMatch[0].replace(',', '.'))
        return isNaN(price) ? null : price

    } catch (error) {
        console.error('Fnac scraping error:', error)
        return null
    }
}

export async function scrapeCulturaPrice(query: string): Promise<number | null> {
    try {
        const searchUrl = `https://www.cultura.com/search/results?search_query=${encodeURIComponent(query)}`

        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            },
        })

        if (!response.ok) {
            console.error(`Cultura scraping failed: ${response.status}`)
            return null
        }

        const html = await response.text()
        const $ = cheerio.load(html)

        // Cultura price selectors (may need adjustment)
        // Common patterns: .price, .product-price, [data-price]
        const priceText = $('.price').first().text().trim() ||
            $('.product-price').first().text().trim() ||
            $('[itemprop="price"]').first().attr('content')

        if (!priceText) return null

        // Extract numeric value
        const priceMatch = priceText.match(/[\d,\.]+/)
        if (!priceMatch) return null

        const price = parseFloat(priceMatch[0].replace(',', '.'))
        return isNaN(price) ? null : price

    } catch (error) {
        console.error('Cultura scraping error:', error)
        return null
    }
}

export async function scrapeRetailPrices(query: string): Promise<{ fnac: number | null; cultura: number | null }> {
    // Rate limiting: 3 seconds between requests
    const fnacPrice = await scrapeFnacPrice(query)
    await delay(3000)
    const culturaPrice = await scrapeCulturaPrice(query)

    return { fnac: fnacPrice, cultura: culturaPrice }
}
