"use strict";

const { MoleculerClientError } = require("moleculer").Errors;
const slug = require("slug");

//const crypto 		= require("crypto");

const DbService = require("../mixins/db.mixin");
const CacheCleanerMixin = require("../mixins/cache.cleaner.mixin");

/**
 * Product represents one product as definition with properties
 * that means not as page, defined by url, that can group multiple products with
 * different properties, but as item, that has different properties than any
 * other product available. eg.:
 * Product #1 - T-shirt Jam - url: /t-shirt-jam - size M, color Red
 * Product #2 - T-shirt Jam - url: /t-shirt-jam - size M, color Blue
 * Product #3 - T-shirt Jam - url: /t-shirt-jam - size L, color Red
 *
 * When loading url /t-shirt-jam all these three products will be loaded and
 * used for creating available options for ordering in front-end app.
 */

module.exports = {
	name: "products",
	mixins: [
		DbService("products"),
		// CacheCleanerMixin([
		// 	"cache.clean.cart"
		// ])
	],

	/**
	 * Default settings
	 */
	settings: {
		/** Public fields */
    idField: "_id",

		fields: [
			"_id", "externalId", "orderCode", "variationGroupId", "slug",
			"publisher", "sellers", // selers = object
			"type", "subtype",
			"country",
			"name", "descriptionShort", "descriptionLong",
			"price", "tax", "priceLevels", // different currencies, customers, ...
			"properties", "data", // {color, size, ...}, {assets, posible upgrades, ...}
			"categories", // list of category slugs
			"stockAmount", "expectedDate", "expectedCount",
			"dates", // dateCreated, dateUpdated, dateSynced
			"note", "activity"
		],

		/** Validator schema for entity */
		entityValidator: {
			externalId: { type: "string", min: 3 },
			orderCode: {type: "string", optional: true, min: 3 },
      variationGroupId: {type: "string", optional: true },
			slug: {type: "string", optional: true },
			publisher: {type: "string", min: 3 },
			sellers: { type: "array", optional: true, items:
				{ type: "object", props: {
					name: { type: "string", optional: true },
					email: { type: "string", min: 8 }
				} }
			},
			type: { type: "string", min: 3 },
			subtype: { type: "string", min: 3, optional: true },
			country: { type: "string", min: 2, optional: true },
			name: { type: "object" },
			descriptionShort: { type: "object", optional: true },
			descriptionLong: { type: "object", optional: true },
			price: { type: "number" },
			tax: { type: "number", optional: true },
			priceLevels: { type: "object", optional: true, props: {
					priceLevelId: { type: "string" },
					price: { type: "number" }
			} },
			properties: { type: "object", optional: true, props: {
			} },
			data: { type: "object", optional: true, props: {
			} },
			categories: { type: "array", items: "string", optional: true }, // category paths
			stockAmount: { type: "number", optional: true },
			expectedDate: { type: "date", optional: true },
			expectedCount: { type: "number", optional: true },
			dates: { type: "object", optional: true, props: {
				dateCreated: { type: "date", optional: true },
				dateUpdated: { type: "date", optional: true },
				dateSynced: { type: "date", optional: true },
			}},
			note: { type: "string", optional: true },
			activity: { type: "number", optional: true },
		}
	},


	/**
	 * Actions
	 */
	actions: {
		/**
		 * Add item to user's cart
		 *
		 * @actions
		 * @param {Object} user - User entity
		 *
		 * @returns {Object} Created entity & token
		 */
		productsList: {
			// auth: "",
			params: {
				category: { type: "string", min: 2 },
				listSubs: { type: "boolean", optional: true },
				filter: { type: "object", optional: true }
			},
			handler(ctx) {
				return ctx.call('categories.detail', { categoryPath: ctx.params.category })
					.then(category => {
            console.log('category: ', category);
						// 1. category exists
						if (category) {
							let categoriesToListProductsIn = [ctx.params.category];
							if (category.subsSlugs && category.subsSlugs.length>0) {
								categoriesToListProductsIn = category.subsSlugs;
							}
              if ( categoriesToListProductsIn.length<1 ) {
                categoriesToListProductsIn = [categoriesToListProductsIn];
              }

							return ctx.call("products.find", {
								"query": {
									"categories": {"$in": categoriesToListProductsIn}
								},
                "limit": (ctx.params.filter<=100 ? ctx.params.filter : 100)
							})
								.then(categoryProducts => {
									let result = {
										'categoryDetail': category,
										'products': categoryProducts
									};
									return ctx.call("categories.find", {
										"query": {
											parentPathSlug: category.pathSlug
										}
									})
									.then(categoriesList => {
										result['categories'] = categoriesList;
										// return result;
                    return ctx.call("products.getMinMaxPrice", {
                      categories: categoriesToListProductsIn
                    }).then(minMaxPrice => {
                      console.log('product.minMaxPrice: ', minMaxPrice);
                      if ( minMaxPrice.length>0 ) {
                        minMaxPrice = minMaxPrice[0];
                        if ( typeof minMaxPrice._id !== "undefined" ) {
                          delete minMaxPrice._id;
                        }
                      }
                      result['filter'] = {
                        'minMaxPrice': minMaxPrice
                      }
                      return result;
                    });
									});
								});
						}
					});
			}
		},


    /**
     * Mongo specific search with _id included
     *
     * @param {Object} query - original query with _id
     *
     * @returns {Object}
     */
    findWithId: {
      params: {
        query: { type: "object" }
      },
      // cache: {
      // 	keys: ["#cartID"]
      // },
      handler(ctx) {
        let queryObject = ctx.params.query;
        let self = this;
        Object.keys(queryObject).forEach(function(key,index) {
          if (key==='_id' && typeof queryObject[key] === "string") {
            queryObject[key] = self.adapter.stringToObjectID(queryObject[key]);
          }
        });
        return this.adapter.find({
          "query": queryObject
        });
      }
    },


		/**
		 * Get detail of product.
		 *
		 * @actions
		 *
		 * @returns {Object} Product entity
		 */
		detail: {
			// auth: "",
			params: {
				product: { type: "string", min: 2 }
			},
			// cache: {
			// 	keys: ["#cartID"]
			// },
			handler(ctx) {
				console.log(ctx.params.product);
				return this.adapter.findById(ctx.params.product)
					.then(found => {
						if (found) { // product found, return it
							return this.adapter.find({
								"query": {
									"variationGroupId": found.variationGroupId,
									"_id": { "$ne": found._id }
								}
							})
							.then(variations => {
								if (!found.data) {
									found.data = {};
								}
								found.data.variations = variations;
								return found;
							});
							return found;
						} else { // no product found, create one
							return Promise.reject(new MoleculerClientError("Product not found!", 400, "", [{ field: "product", message: "not found"}]));
						}
					});
			}
		},



    getMinMaxPrice: {
      // auth: "",
      params: {
        categories: { type: "array" }
      },
      // cache: {
      // 	keys: ["#cartID"]
      // },
      handler(ctx) {
        let categories = ctx.params.categories;
        console.log( '----aggr----'+"\n", categories);
        return this.adapter.collection.aggregate([
          { "$match": {
            "categories": {"$in": categories}
          }},
          { "$group": {
            "_id": null,
            "max": { "$max": "$price" },
            "min": { "$min": "$price" }
          }}
        ]).toArray()
        .then(minMaxPrice => {
          return minMaxPrice;
        });
      }
    },



		/**
		 * Import product data:
		 *  - products - with categories
		 *
		 * @actions
		 *
		 * @returns {Object} Product entity
		 */
		import: {
			auth: "required",
			params: {
				products: { type: "array", items: "object", optional: true },
			},
      cache: false,
			handler(ctx) {
				console.log('--- import products ---');
				let products = ctx.params.products;
				let promises = [];
				let mythis = this;

        if (ctx.meta.user.type=='admin') {
  				if ( products && products.length>0 ) {
  					// loop products to import
  					products.forEach(function(entity) {
  						promises.push(
  							// add product results into result variable
  							mythis.adapter.findById(entity.id)
  								.then(found => {
  									if (found) { // product found, update it
  										return mythis.validateEntity(entity)
  											.then(() => {
  												console.log("found: ", entity);
  												if (!entity.dates) {
  													entity.dates = {};
  												}
  												entity.dates.dateUpdated = new Date();
  												entity.dates.dateSynced = new Date();
                          let entityId = entity.id;
                          delete entity.id;
          								const update = {
          									"$set": entity
          								};
  												return mythis.adapter.updateById(entityId, update);
  											});
  									} else { // no product found, create one
  										return mythis.validateEntity(entity)
  										.then(() => {
  											// set generic variables
  											if ( !entity.slug || entity.slug.trim() == "") {
                          let lang = ctx.meta.localsDefault.lang;
                          if ( ctx.meta.localsDefault.lang.code ) {
                            lang = ctx.meta.localsDefault.lang.code;
                          }
  												entity.slug = slug(entity.name[lang], { lower: true });
                          // + "-" + (Math.random() * Math.pow(36, 6) | 0).toString(36);
  											}
  											return ctx.call("products.find", {
          								"query": {
                            slug: entity.slug
                          }
                        })
  											.then(slugFound => {
  												if (slugFound && slugFound.constructor !== Array) {
  													return { 'error' : "Slug "+entity.slug+" already used." };
  												}

  												// TODO - check if slug paths don't already exist
  												if (ctx.meta.user && ctx.meta.user.email) {
  													entity.publisher = ctx.meta.user.email.toString();
  												}
  												if (!entity.dates) {
  													entity.dates = {};
  												}
  												entity.dates.dateCreated = new Date();
  												entity.dates.dateUpdated = new Date();
  												entity.dates.dateSynced = new Date();

  												return mythis.adapter.insert(entity)
  													.then(doc => mythis.transformDocuments(ctx, {}, doc))
  													.then(json => mythis.entityChanged("created", json, ctx).then(() => json));
  											});
  										});
  									}
  								})); // push with find end
  					});
  				}

  				// return multiple promises results
  				return Promise.all(promises).then(prom => {
  					console.log("\n\n------------import prom---:", prom);
  			    return prom;
  				});
        } else { // not admin user
          return Promise.reject(new MoleculerClientError("Permission denied", 403, "", []));
        }
			} // handler end
		},


		/**
		 * Delete product data by id
		 *
		 * @actions
		 *
		 * @returns {Object} Product entity
		 */
		delete: {
			auth: "required",
			params: {
				products: { type: "array", items: "object", optional: true },
			},
			// cache: {
			// 	keys: ["#cartID"]
			// },
			handler(ctx) {
				console.log('--- delete products ---');
				let products = ctx.params.products;
				let promises = [];
				let mythis = this;

        if (ctx.meta.user.type=='admin') {
  				if ( products && products.length>0 ) {
  					// loop products to import
  					products.forEach(function(entity) {
  						promises.push(
  							// add product results into result variable
  							mythis.adapter.findById(entity.id)
  								.then(found => {
  									if (found) { // product found, delete it
                      console.log("DELETING product "+found._id);
  										return ctx.call("products.remove", {id: found._id} )
                      .then((deletedCount) => {
                        console.log("deleted product Count: ",deletedCount);
                        return deletedCount;
                      }); // returns number of removed items
  									} else {
                      console.log(entity.id+" not found");
                    }
  								})); // push with find end
  					});
  				}

  				// return multiple promises results
  				return Promise.all(promises).then(() => {
  				    return promises;
  				});
        } else { // not admin user
          return Promise.reject(new MoleculerClientError("Permission denied", 403, "", []));
        }
			} // handler end
		},



	}, // *** actions end




	/**
	 * Methods
	 */
	methods: {
	},

	events: {
		// "cache.clean.cart"() {
		// 	if (this.broker.cacher)
		// 		this.broker.cacher.clean(`${this.name}.*`);
		// }
	}
};
