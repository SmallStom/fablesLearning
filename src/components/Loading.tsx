export default function Loading({ worldName }: { worldName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <div className="w-8 h-8 border-3 border-gray-200 border-t-gray-600 rounded-full animate-spin mb-4" />
      <p className="text-sm text-gray-500">
        正在从「{worldName}」理解这个概念……
      </p>
    </div>
  );
}
