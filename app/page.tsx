export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-blue-50 to-white">
      <main className="max-w-3xl text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Base Infrastructure
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Next.js + MongoDB + MinIO + PWA
        </p>

        <div className="flex gap-4 mt-8 justify-center">
          <a
            href="/api/health"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            target="_blank"
          >
            Health Check
          </a>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 bg-white rounded-xl shadow-md border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Services</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• MongoDB (Docker)</li>
              <li>• MinIO Storage (Docker)</li>
              <li>• PWA Support</li>
            </ul>
          </div>

          <div className="p-6 bg-white rounded-xl shadow-md border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Architecture</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Client Layer</li>
              <li>• Service Layer</li>
              <li>• Clean Patterns</li>
            </ul>
          </div>
        </div>
      </main>

      <footer className="absolute bottom-4 text-gray-500 text-sm">
        Clean Base • Ready to Build
      </footer>
    </div>
  );
}
