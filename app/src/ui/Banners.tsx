// The banners of src/lib/mode.ts. The shell shows them above every screen.
export function Banners({ texts }: { texts: string[] }) {
  if (texts.length === 0) return null;
  return (
    <div className="banners">
      {texts.map((text) => (
        <p key={text} className="banner" role="note">
          {text}
        </p>
      ))}
    </div>
  );
}
