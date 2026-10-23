import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children, wide = false }: PropsWithChildren<{ wide?: boolean }>) {
    return (
        <div className="flex min-h-screen flex-col items-center bg-gray-100 px-4 pt-6 sm:justify-center sm:pt-0">
            <div className="flex flex-col items-center gap-3">
                <Link href="/">
                    <img
                        src="/kebunkode.jpg"
                        alt="KebunKode"
                        className="h-24 w-24 rounded-2xl border border-gray-200 bg-white object-contain p-2 shadow-sm"
                    />
                </Link>
                <div className="text-center">
                    <div className="text-lg font-extrabold tracking-tight text-gray-900">Saung Lele CRM</div>
                    <div className="mt-0.5 text-[11px] font-medium text-gray-500">Dikelola oleh KebunKode</div>
                </div>
            </div>

            <div
                className={`mt-6 w-full overflow-hidden bg-white px-6 shadow-md sm:rounded-2xl ${
                    wide ? 'py-6 sm:max-w-5xl sm:px-8 sm:py-8' : 'py-4 sm:max-w-md'
                }`}
            >
                {children}
            </div>

            <div className="mt-5 pb-6 text-center text-[10px] text-gray-400">
                Karawang, Jawa Barat · 0813 18 988 499
            </div>
        </div>
    );
}
