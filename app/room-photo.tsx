export default function RoomPhoto({ url }: { url: string | null }) {
  return (
    <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-brand-soft">
      {url ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <svg
          viewBox="0 0 24 24"
          className="h-12 w-12 text-brand-strong"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17" />
          <path d="M2 21h20" />
          <path d="M16 8h3a1 1 0 0 1 1 1v12" />
          <circle cx="12" cy="13" r="0.75" fill="currentColor" />
        </svg>
      )}
    </div>
  );
}
