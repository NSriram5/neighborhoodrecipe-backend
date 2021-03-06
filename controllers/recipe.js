const Sequelize = require('sequelize');
const Recipe = require('../models').Recipe;
const Ingredient = require('./ingredients');
const Op = require('../models/').Sequelize.Op;
const RecipeIngredientJoin = require('./recipeIngredientJoin');
const userUserJoins = require('./userUserJoins');
const recipeIngredientModel = require('../models').recipeIngredientJoin;
const ingredientModel = require('../models').Ingredient;
const db = require('../models');
const userModel = require('../models').User;
const userUserJoinModel = require('../models').userUserJoins;

const allAttributes = ['recipeUuid', 'recipeName', 'mealCategory', 'dietCategory', 'flatCategories', 'servingCount', 'websiteReference', 'farenheitTemp',
    'minuteTimeBake', 'minuteTotalTime', 'minutePrepTime', 'minuteCookTime', 'instructions', 'flatInstructions', 'toolsNeeded', 'disabled', 'userUuId', 'photoUrl', 'edamamETag', 'kCals', 'fat', 'fatsat', 'fattrans', 'carbs', 'fiber', 'sugar', 'protein', 'cholesterol', 'sodium'
];

const previewAttributes = ['recipeUuid', 'recipeName', 'mealCategory', 'dietCategory', 'flatCategories', 'servingCount', 'websiteReference', 'farenheitTemp',
    'minuteTimeBake', 'minuteTotalTime', 'minutePrepTime', 'minuteCookTime', 'flatInstructions', 'toolsNeeded', 'disabled', 'photoUrl'
];


/**
 * creates a new recipe
 * @param {Object} recipe an object that represents information to build a recipe
 * @returns 
 */
const createRecipe = async function(recipe) {
    let recipeIngredientList = [];
    //scan through the recipe ingredients
    for (element in recipe.ingredients) {
        let indingredient = {};
        indingredient.label = recipe.ingredients[element].label;
        //create ingredients
        await Ingredient.createIngredient(indingredient)
            .then((result) => {
                let recipeIngredientItem = {};
                recipeIngredientItem.ingredientUuid = result.ingredientUuid;
                recipeIngredientItem.quantity = recipe.ingredients[element].quantity;
                recipeIngredientItem.measurement = recipe.ingredients[element].measurement;
                recipeIngredientItem.prepInstructions = recipe.ingredients[element].prepInstructions;
                recipeIngredientItem.additionalInfo = recipe.ingredients[element].additionalInfo;

                recipeIngredientList.push(recipeIngredientItem);
            })
            .catch((exception) => {
                console.log('**********************************Recipe Ingredient Creation Exception************************');
                console.log(exception);
                console.log(recipe);
                console.log(element);
                console.log('Error creating Ingredient within a recipe');
                console.log('**********************************End Exception************************');
            })

    };
    //all ingredients have been created... Create the recipe now
    recipe.flatInstructions = JSON.stringify(recipe.instructions);
    recipe.flatIngredients = recipe.ingredients ? recipe.ingredients.reduce((acc, curr) => {
        return `${acc} ${curr.label}`;
    }, '') : "";
    recipe.flatCategories = recipe.mealCategory ? JSON.stringify(recipe.mealCategory) : "";
    recipe.flatCategories += recipe.dietCategory ? JSON.stringify(recipe.dietCategory) : "";
    let { ingredients, ...newRecipe } = recipe;
    return await Recipe
        .create(
            newRecipe, {
                returning: previewAttributes
            })
        .then(async(result) => {
            for (ri in recipeIngredientList) {
                recipeIngredientList[ri].recipeUuid = result.dataValues.recipeUuid;
            };
            await RecipeIngredientJoin
                .bulkCreate(recipeIngredientList)
                .then((result) => {

                })
                .catch((riError) => {
                    console.log(riError);

                });
            return result;
        })
        .catch(error => {
            console.log(error, 'There was an error in the create');
        });
}

const getRecipe = async function(filter) {
    let whereclause;
    whereclause = {};
    let offsetClause = {};
    let limitClause = {};
    if (filter == undefined) { filter = {}; }
    if (filter.recipeUuid) {
        whereclause.recipeUuid = {
            [Op.eq]: filter.recipeUuid
        };
    }
    if (filter.recipeName) {
        whereclause.recipeName = {
            [Op.iLike]: '%' + filter.recipeName + '%'
        };
    }
    if (filter.category) {
        whereclause.flatCategories = {
            [Op.iLike]: '%' + filter.category + '%'
        };
    }
    if (filter.instructions) {
        whereclause.flatInstructions = {
            [Op.iLike]: '%' + filter.instructions + '%'
        };
    }
    if (filter.toolsNeeded) {
        whereclause.toolsNeeded = {
            [Op.iLike]: '%' + filter.toolsNeeded + '%'
        };
    }
    if (filter.disabled) {
        whereclause.disabled = {
            [Op.eq]: filter.disabled
        };
    }
    if (filter.users) {
        whereclause.user = {
            [Op.or]: filter.user.map((user) => {
                return {
                    userUuId: {
                        [Op.eq]: filter.userUuId
                    }
                };
            })
        }
    }
    if (filter.offset) {
        offsetClause.offset = filter.offset;
    } else { offsetClause.offset = 0; }
    if (filter.limit) {
        limitClause.limit = filter.limit;
    } else { limitClause.limit = 21; }
    return Recipe
        .findAndCountAll({
            model: Recipe,
            where: whereclause,
            limitClause,
            offsetClause,
            attributes: allAttributes,
            include: [userModel]
                //raw: true,
        })
        .then((result) => {
            //console.log('Recipe Found');
            return result;
        })
        .catch(error => {
            console.log(error, 'There was an error in the find');
        });
}

const getFullRecipe = async function(filter) {
    let whereclause;
    whereclause = {};
    let offsetClause = {};
    let limitClause = {};
    if (filter.recipeName) {
        whereclause.recipeName = {
            [Op.iLike]: '%' + filter.recipeName + '%'
        };
    }
    if (filter.userId) {
        whereclause.userId = {
            [Op.eq]: filter.userId
        };
    }
    if (filter.recipeUuid) {
        whereclause.recipeUuid = {
            [Op.eq]: filter.recipeUuid
        };
    }
    if (filter.offset) {
        offsetClause.offset = filter.offset;
    } else { offsetClause.offset = 0; }
    if (filter.limit) {
        limitClause.limit = filter.limit;
    } else { limitClause.limit = 5; }
    return Recipe
        .findAll({
            raw: true,
            include: [
                userModel,
                ingredientModel
            ],
            where: whereclause,
            limitClause,
            offsetClause,
            nest: true,
            attributes: allAttributes,
        })
        .then((result) => {
            let tempRes = result[0];
            IngredientArray = [];
            for (index in result) {
                let item = result[index];
                let ing = item.Ingredients;

                ing.quantity = result[index].Ingredients.recipeIngredientJoin.quantity;
                ing.measurement = result[index].Ingredients.recipeIngredientJoin.measurement;
                ing.prepInstructions = result[index].Ingredients.recipeIngredientJoin.prepInstructions;
                ing.additionalInfo = result[index].Ingredients.recipeIngredientJoin.additionalInfo;
                delete ing.recipeIngredients;
                IngredientArray.push(ing);
            }
            tempRes.Ingredients = IngredientArray;
            //console.log(tempRes);
            return tempRes;
        })
        .catch(error => {
            console.log(error, 'There was an error in the find');
        });
}

const deleteRecipe = async function(recipeUuid) {
    if (recipeUuid == undefined) {
        console.log('Error: no recipeUuid supplied', recipeUuid);
        return { error: true, message: 'No recipeUuid supplied. recipeUuid required to retrieve full recipeUuid' };
    }
    let response
    try {
        response = await Recipe.findOne({ where: { recipeUuid: recipeUuid } });
        //response = await Recipe.findByPk(recipeUuid);
    } catch (err) {
        console.log(err);
    }
    if (!response) return { message: "delete unsuccessful" };
    await response.destroy();
    return { message: "delete successful" };
}

const getMyRecipes = async function(userUuId, connected = false, searchParams = undefined) {
    let whereclause = {};
    if (searchParams) {
        whereclause = {
            [Op.or]: [{
                    recipeName: {
                        [Op.iLike]: '%' + searchParams + '%'
                    }
                },
                {
                    recipeName: {
                        [Op.iLike]: '%' + searchParams + '%'
                    }
                },
                {
                    flatCategories: {
                        [Op.iLike]: '%' + searchParams + '%'
                    }
                },
                {
                    websiteReference: {
                        [Op.iLike]: '%' + searchParams + '%'
                    }
                },
                {
                    flatInstructions: {
                        [Op.iLike]: '%' + searchParams + '%'
                    }
                },
                {
                    flatIngredients: {
                        [Op.iLike]: '%' + searchParams + '%'
                    }
                }
            ]
        }
    }
    let recipesFromOthers
    try {
        recipesFromOthers = await userModel.findAll({
            where: {
                userUuId: {
                    [Op.eq]: userUuId
                }
            },
            include: [{
                    model: userModel,
                    as: "friends",
                    include: [{
                        model: Recipe,
                        where: whereclause
                    }],
                },
                {
                    model: userModel,
                    as: "friendsMe",
                    include: [{
                        model: Recipe,
                        where: whereclause
                    }],
                }
            ],
            //raw: true,
            nest: true,
        });
    } catch (err) {
        console.log(err);
    }
    let recipesFromMe
    try {
        recipesFromMe = await Recipe.findAll({
            where: { userUuId: userUuId, ...whereclause },
            raw: true
        });
    } catch (err) {
        console.log(err);
    }
    let friendsWithRecipes = [...recipesFromOthers[0].friendsMe.filter((item) => {
        return item.userUserJoins.accepted
    }), ...recipesFromOthers[0].friends.filter((item) => {
        return item.userUserJoins.accepted
    })];
    let theirRecipes = friendsWithRecipes.reduce((acc, curr) => { return [...acc, ...curr.Recipes] }, []);
    let theirRecipesDataValues = theirRecipes.map((item) => { return item.dataValues });

    let allFound = [...recipesFromMe, ...theirRecipesDataValues];
    return allFound;
}


const updateRecipe = async function(recipe) {
    let whereclause = {};
    if (recipe.recipeUuid == undefined) { return { error: 'You must submit a recipeUuid' }; }

    whereclause.recipeUuid = {
        [Op.eq]: recipe.recipeUuid
    };
    let res = await Recipe.findOne({
        where: whereclause,
        //raw: true
    });
    if (!res) {
        console.log('recipe doesn\'t exist');
        return { error: true, message: 'The recipe doesn\'t exist. please create it first.' };
    }
    let returnRecipeIngredients = RecipeIngredientJoin.getRecipeIngredients({ recipeUuid: recipe.recipeUuid });
    let recipeIngredientList = [];
    for (element in recipe.Ingredients) {
        let indingredient = {};
        indingredient.Name = recipe.Ingredients[element].label;
        console.log(indingredient);
        await Ingredient
            .createIngredient(indingredient)
            .then((result) => {
                let recipeIngredientItem = {};
                recipeIngredientItem.ingredientUuid = result.ingredientUuid;
                recipeIngredientItem.quantity = recipe.ingredients[element].quantity;
                recipeIngredientItem.measurement = recipe.ingredients[element].measurement;
                recipeIngredientItem.prepInstructions = recipe.ingredients[element].prepInstructions;
                recipeIngredientItem.additionalInfo = recipe.ingredients[element].additionalInfo;
                recipeIngredientList.push(recipeIngredientItem);
            })
            .catch((exception) => {
                console.log(exception);
                console.log('Error creating Ingredient');
            })
    };
    recipe.flatIngredients = recipe.ingredients.reduce((acc, curr) => {
        return `${acc} ${curr.label}`;
    }, '');
    recipe.flatInstructions = recipe.instructions ? JSON.stringify(recipe.instructions) : "";
    recipe.flatCategories = (recipe.mealCategory || recipe.dietCategory) ? `${JSON.stringify(recipe.mealCategory)}${JSON.stringify(recipe.dietCategory)}` : "";
    let newRecipe = {...recipe }
    let returnedRecipeIngredients = await returnRecipeIngredients;
    for (temp in recipeIngredientList) {
        newIngredient = recipeIngredientList[temp];
        let altered = true;
        let newRi = true;
        for (existing in returnedRecipeIngredients) {
            if (returnedRecipeIngredients[existing].ingredientId == newIngredient.ingredientId) {
                newRi = false;
                newIngredient.id = returnedRecipeIngredients[existing].id;
                if (returnedRecipeIngredients[existing].quantity == newIngredient.quantity) {
                    altered = false;
                }
            }
        }
        if (altered || newRi) {
            RecipeIngredientJoin.updateOrCreateRecipeIngredient(newIngredient);
        }
    }

    return Recipe
        .update(
            newRecipe, {
                where: { recipeUuid: newRecipe.recipeUuid },
                returning: true,
                //raw: true
            })
        .then((result) => {
            return result;
        })
        .catch(error => {
            console.log(error, 'There was an error in the recipe update');
        });
}

module.exports = {
    createRecipe,
    getRecipe,
    getFullRecipe,
    deleteRecipe,
    getMyRecipes,
    updateRecipe
}