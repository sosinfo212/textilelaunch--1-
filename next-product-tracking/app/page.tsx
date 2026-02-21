import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Next Product Tracking</h1>
      <p className="mt-2 text-gray-600">
        <Link href="/products/sample-product" className="text-blue-600 underline">
          Go to sample product
        </Link>{" "}
        to test tracking.
      </p>
    </main>
  );
}
