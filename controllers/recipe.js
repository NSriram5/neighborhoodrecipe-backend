const Sequelize = require('sequelize');
const Recipe = require('../models').Recipe;
const Ingredient = require('./ingredients');
const Op = require('../models/').Sequelize.Op;
const RecipeIngredientJoin = require('./recipeIngredientJoin');
const recipeIngredientModel = require('../models').RecipeIngredientJoin;
const ingredientmodel = require('../models').Ingredient;
const userModel = require('../models').User;

/**
 * creates a new recipe
 * @param {*} recipe{}
 * @returns 
 */
const createRecipe = async function(recipe) {
    let recipeIngredientList = [];
    //scan through the recipe ingredients
    for (element in recipe.ingredients) {
        let indingredient = {};
        indingredient.label = recipe.ingredients[element].label;
        //create ingredients
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
                console.log('Error creating Ingredient within a recipe');
            })
    };
    //all ingredients have been created... Create the recipe now
    let { ingredients, ...newRecipe } = recipe;
    return await Recipe
        .create(
            newRecipe, {
                returning: ['recipeUuid', 'recipeName', 'mealCategory', 'dietCategory', 'servingCount', 'websiteReference', 'farenheitTemp', 'minuteTimeBake', 'minuteTotalTime', 'minutePrepTime', 'instructions', 'toolsNeeded', 'disabled']
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
    if (filter.mealCategory) {
        whereclause.mealCategory = {
            [Op.iLike]: filter.mealCategory
        };
    }
    if (filter.dietCategory) {
        whereclause.dietCategory = {
            [Op.iLike]: filter.dietCategory
        };
    }
    if (filter.instructions) {
        whereclause.instructions = {
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
            raw: true,
            attributes: ['recipeUuid', 'recipeName', 'mealCategory', 'dietCategory', 'servingCount', 'websiteReference', 'farenheitTemp',
                'minuteTimeBake', 'minuteTotalTime', 'minutePrepTime', 'instructions', 'toolsNeeded', 'disabled'
            ],
        })
        .then((result) => {
            console.log('Recipe Found');
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
                ingredientmodel
            ],
            where: whereclause,
            limitClause,
            offsetClause,
            //group:['Ingredients.id', 'Recipe.id','Ingredients->recipeIngredients.quantity'],

            nest: true,
            attributes: ['recipeUuid', 'recipeName', 'mealCategory', 'dietCategory', 'servingCount', 'websiteReference', 'farenheitTemp',
                'minuteTimeBake', 'minuteTotalTime', 'minutePrepTime', 'instructions', 'toolsNeeded', 'disabled', 'userUuId'
            ],
            //}]
        })
        .then((result) => {
            //console.log(result);
            let tempRes = result[0];
            //console.log(tempRes.Ingredients);
            IngredientArray = [];
            //tempRes.Ingredients = [];
            for (index in result) {
                //console.log(result);
                let item = result[index];
                let ing = item.Ingredients;
                //console.log('this is item?');
                //console.log(item);
                //console.log(item.Ingredients.recipeIngredients);
                //console.log(ing.recipeIngredients);
                //console.log(result[index].Ingredients)
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
    let whereclause = {};
    if (recipeUuid == undefined) {
        console.log('Error: no recipeUuid supplied', recipeUuid);
        return { error: true, message: 'No recipeUuid supplied. recipeUuid required to retrieve full recipeUuid' };
    }
    whereclause.recipeUuid = {
        [Op.eq]: recipeUuid
    };
    const response = await Recipe.findOne({
        whereclause
    });
    if (!response) return { message: "delete unsuccessful" };
    await response.destroy();
    return { message: "delete successful" };
}

const getMyRecipes = async function(userid) {
    let whereclause = {};
    whereclause.userId = {
        [Op.eq]: userid
    };
    return Recipe
        .findAll({
            where: whereclause,
            raw: true,
            attributes: ['id', 'Name', 'ABV', 'OG', 'FG', 'IBU', 'token',
                'styleId', 'public', 'shareable', 'instructions', 'userId'
            ],
        })
        .catch((error) => {
            console.log(error);
            return error;
        })
}

const updateRecipe = async function(recipe) {
    let whereclause = {};
    if (recipe.recipeUuid == undefined) { return { error: 'You must submit a recipeUuid' }; }

    whereclause.recipeUuid = {
        [Op.eq]: recipe.recipeUuid
    };
    let res = await Recipe.findOne({
        where: whereclause,
        raw: true
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
                raw: true
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