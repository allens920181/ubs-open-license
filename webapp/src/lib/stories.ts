/** Story pictures are downloaded by scripts/fetch_stories.py into public/stories/<id>/NN.jpg (kept out of git). */
export const slideUrl = (id: string, n: number) => `${import.meta.env.BASE_URL}stories/${id}/${String(n).padStart(2, "0")}.jpg`;
