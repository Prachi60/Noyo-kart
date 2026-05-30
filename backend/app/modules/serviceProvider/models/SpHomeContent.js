import mongoose from 'mongoose';

const spHomeContentSchema = new mongoose.Schema({
  cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpCity', default: null, index: true },
  banners: [{
    imageUrl: { type: String, default: '' },
    text: { type: String, default: '' },
    targetCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpCategory', default: null },
    slug: { type: String, default: '' },
    order: { type: Number, default: 0 }
  }],
  promos: [{
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    buttonText: { type: String, default: 'Explore' },
    gradientClass: { type: String, default: 'from-blue-600 to-blue-800' },
    imageUrl: { type: String, default: '' },
    targetCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpCategory', default: null },
    slug: { type: String, default: '' },
    order: { type: Number, default: 0 }
  }],
  curated: [{
    title: { type: String, default: '' },
    gifUrl: { type: String, default: '' },
    youtubeUrl: { type: String, default: '' },
    order: { type: Number, default: 0 }
  }],
  noteworthy: [{
    title: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    targetCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpCategory', default: null },
    slug: { type: String, default: '' },
    order: { type: Number, default: 0 }
  }],
  booked: [{
    title: { type: String, default: '' },
    rating: { type: String, default: '' },
    reviews: { type: String, default: '' },
    price: { type: String, default: '' },
    originalPrice: { type: String, default: '' },
    discount: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    targetCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpCategory', default: null },
    slug: { type: String, default: '' },
    order: { type: Number, default: 0 }
  }],
  categorySections: [{
    title: { type: String, required: true },
    seeAllTargetCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpCategory', default: null },
    seeAllSlug: { type: String, default: '' },
    cards: [{
      title: String, imageUrl: String, badge: String, price: String,
      originalPrice: String, discount: String, rating: String, reviews: String,
      targetCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpCategory', default: null },
      slug: { type: String, default: '' }
    }],
    order: { type: Number, default: 0 }
  }],
  isActive: { type: Boolean, default: true },
  isBannersVisible: { type: Boolean, default: true },
  isPromosVisible: { type: Boolean, default: true },
  isCuratedVisible: { type: Boolean, default: true },
  isNoteworthyVisible: { type: Boolean, default: true },
  isBookedVisible: { type: Boolean, default: true },
  isCategorySectionsVisible: { type: Boolean, default: true },
  isCategoriesVisible: { type: Boolean, default: true }
}, { timestamps: true });

spHomeContentSchema.statics.getHomeContent = async function (cityId = null) {
  let query = { cityId: cityId || null };
  let homeContent = await this.findOne(query);
  if (!homeContent) homeContent = await this.create(query);
  return homeContent;
};

export default mongoose.model('SpHomeContent', spHomeContentSchema);
