
export async function fetchCelebrityImage(name: string): Promise<string | null> {
  try {
    // Try Korean Wikipedia first
    const koUrl = `https://ko.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(name)}&prop=pageimages&format=json&pithumbsize=600&origin=*`;
    const koResponse = await fetch(koUrl);
    const koData = await koResponse.json();
    
    const koPages = koData.query?.pages;
    if (koPages) {
      const pageId = Object.keys(koPages)[0];
      if (pageId !== "-1" && koPages[pageId].thumbnail) {
        return koPages[pageId].thumbnail.source;
      }
    }

    // Fallback to English Wikipedia
    const enUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(name)}&prop=pageimages&format=json&pithumbsize=600&origin=*`;
    const enResponse = await fetch(enUrl);
    const enData = await enResponse.json();
    
    const enPages = enData.query?.pages;
    if (enPages) {
      const pageId = Object.keys(enPages)[0];
      if (pageId !== "-1" && enPages[pageId].thumbnail) {
        return enPages[pageId].thumbnail.source;
      }
    }

    return null;
  } catch (error) {
    console.error("Error fetching celebrity image:", error);
    return null;
  }
}
