export async function getImageByQuery(query: string) {
  const response = await fetch(
    `https://api.unsplash.com/search/photos?query=${query}&client_id=${process.env.UNSPLASH_ACCESS_KEY}`
  );
  const data = await response.json();
  return data.results[0].urls.small;
}