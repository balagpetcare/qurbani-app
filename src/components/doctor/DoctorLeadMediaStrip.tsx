type Props = { urls: string[] };

export function DoctorLeadMediaStrip({ urls }: Props) {
  if (urls.length === 0) return null;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        ছবি / ভিডিও
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {urls.map((url) => {
          const isVid =
            /\.(mp4|webm|ogg)(\?|$)/i.test(url) || url.includes("video");
          return (
            <li key={url} className="overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50">
              {isVid ? (
                <video
                  src={url}
                  controls
                  className="max-h-56 w-full object-contain"
                  preload="metadata"
                />
              ) : (
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="max-h-56 w-full object-cover"
                  />
                </a>
              )}
              <p className="truncate px-2 py-1 text-xs text-zinc-500">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 hover:underline"
                >
                  লিংক খুলুন
                </a>
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
