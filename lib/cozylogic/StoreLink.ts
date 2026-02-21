// lib/cozylogic/storeLinks.ts
export function storeSearchLinks(query: string) {
    const q = encodeURIComponent(query);
    return [
      { store: "Target", url: `https://www.target.com/s?searchTerm=${q}` },
      { store: "Walmart", url: `https://www.walmart.com/search?q=${q}` },
      { store: "Wayfair", url: `https://www.wayfair.com/keyword.php?keyword=${q}` },
      { store: "Kohl's", url: `https://www.kohls.com/search.jsp?search=${q}` },
      { store: "eBay", url: `https://www.ebay.com/sch/i.html?_nkw=${q}` },
      { store: "Amazon", url: `https://www.amazon.com/s?k=${q}` },
    ];
  }