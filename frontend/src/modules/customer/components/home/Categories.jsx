import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { customerApi } from '../../services/customerApi';
import { applyCloudinaryTransform } from '@/core/utils/imageUtils';

const COLORS = [
    'bg-red-50', 'bg-brand-50', 'bg-blue-50', 'bg-orange-50',
    'bg-yellow-50', 'bg-purple-50', 'bg-pink-50', 'bg-teal-50',
    'bg-indigo-50', 'bg-amber-50'
];

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            setIsLoading(true);
            try {
                // Fetch flat categories, assuming we want top-level or featured categories on home
                const res = await customerApi.getCategories({ type: "category", limit: 10 });
                if (res.data.success || res.data) {
                    // Extract items if paginated response, otherwise direct array
                    const items = res.data.items || res.data || [];
                    
                    const formattedCategories = items.map((cat, idx) => ({
                        id: cat._id || cat.id,
                        name: cat.name,
                        image: cat.image || "https://cdn.grofers.com/cdn-cgi/image/f=auto,fit=scale-down,q=70,metadata=none,w=270/layout-engine/2022-11/Slice-1_9.png",
                        slug: cat.slug || cat.name.toLowerCase(),
                        color: COLORS[idx % COLORS.length]
                    }));
                    
                    setCategories(formattedCategories);
                }
            } catch (error) {
                console.error("Error fetching categories:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCategories();
    }, []);

    if (isLoading && categories.length === 0) {
        return (
            <section className="py-8 bg-white">
                <div className="container w-full max-w-[1920px] mx-auto px-4 md:px-[50px]">
                    <div className="flex items-center justify-between mb-8">
                        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
                    </div>
                    <div className="flex gap-6 overflow-x-auto pb-4">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="flex flex-col items-center gap-4 min-w-[140px]">
                                <div className="h-36 w-36 rounded-full bg-gray-100 animate-pulse"></div>
                                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    if (categories.length === 0) return null;

    return (
        <section className="py-8 bg-white">
            <div className="container w-full max-w-[1920px] mx-auto px-4 md:px-[50px]">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0284c7]">Shop by Category</h2>
                    <a href="/categories" className="text-sm font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors">
                        See All <ArrowRight size={16} />
                    </a>
                </div>

                <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x -mx-4 px-4 md:mx-0 md:px-0 md:flex md:flex-wrap md:gap-8 md:justify-start">
                    {categories.slice(0, 8).map((category) => (
                        <a
                            key={category.id}
                            href={`/category/${category.id}`}
                            className="flex flex-col items-center gap-4 min-w-[140px] snap-start group cursor-pointer"
                        >
                            <div className={`h-36 w-36 rounded-full ${category.color} p-4 flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl border border-slate-100`}>
                                <img
                                    src={applyCloudinaryTransform(category.image)}
                                    alt={category.name}
                                    className="w-full h-full object-contain drop-shadow-sm mix-blend-multiply rounded-full"
                                    loading="lazy"
                                />
                            </div>
                            <span className="text-lg font-medium text-slate-700 group-hover:text-brand-600 transition-colors">
                                {category.name}
                            </span>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Categories;

