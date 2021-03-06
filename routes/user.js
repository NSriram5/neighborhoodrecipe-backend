"use strict";

/** Routes for user interactions. */

const jsonschema = require("jsonschema");
const userUpdateSchema = require("../schemas/userUpdate.json");
const User = require("../controllers/user");
const UserUserJoins = require("../controllers/userUserJoins");
const express = require("express");
const router = express.Router();
const { ensureLoggedIn, ensureAdmin } = require("../middleware/auth");
const { BadRequestError, ForbiddenError, ExpressError } = require("../expressError");

/**
 * GET / => returns a list of users
 * 
 * Returns a list of users
 * 
 * Authorization required: login and admin
 */
router.get("/", ensureLoggedIn, ensureAdmin, async function(req, res, next) {
    try {
        const users = await User.getUsers({});
        return res.json({ users: users });
    } catch (err) {
        console.log(err);
        return next(err);
    }
});

/**
 * GET /:userUuId => returns details about one specific user
 * 
 * Returns a json breakdown of user info
 * 
 * Authorization required: login of target user OR admin
 */
router.get("/:userUuId", ensureLoggedIn, async function(req, res, next) {
    try {
        const user = await User.getUsers({ userUuId: req.params.userUuId });
        if (res.locals.user.isAdmin == false && res.locals.user.userUuId != user[0].dataValues.userUuId) {
            throw new ForbiddenError("Only an admin or the user of this account can view these user details");
        }
        return res.json({ user: user[0] });

    } catch (err) {
        console.log(err);
        return next(err);
    }
});

/**
 * POST emailSearch/ => finds a user that matches the email listed in the post body
 * 
 * Returns the basic information about a user that matches an email parameter
 * 
 * Authorization required: login
 */
router.post("/emailSearch", ensureLoggedIn, async function(req, res, next) {
    try {
        const filter = {...req.body, privacySetting: false };
        let response = await User.getUsers(filter);
        response = response[0].dataValues;
        delete response.passwordHash;
        delete response.disabled;
        delete response.isAdmin;
        delete response.privacySetting;
        delete response.wantsNutritionData;
        return res.json({...response });
    } catch (err) {
        console.log(err);
        return next(err);
    }
})

/**
 * GET /requests/:userUuId => returns a list of connection requests for a given user
 * 
 * Returns a list of users that have pending incoming connection requests
 * 
 * Authorization required: login and user of target search OR admin
 */
router.get("/connections/:userUuId", ensureLoggedIn, async function(req, res, next) {
    try {
        if (res.locals.user.isAdmin == false && res.locals.user.userUuId != req.params.userUuId) {
            throw new ForbiddenError("Only an admin or the user of this account can view these details");
        }
        const users = await UserUserJoins.getUserUserConnections({ userUuId: req.params.userUuId });
        return res.json({ users });

    } catch (err) {
        console.log(err);
        return next(err);
    }
})

/**
 * POST /:userUuId => updates a user's information
 * 
 * Returns the updated user info
 * 
 * Authorization required: login of user OR admin
 */
router.post("/:userUuId", ensureLoggedIn, async function(req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, userUpdateSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }
        const valid = await User.authenticateUser(req.body.oldUserName, req.body.oldPassword);
        if (!valid) {
            throw new ExpressError("Invalid userName or password", 400);
        }
        req.body.password = req.body.newPassword;
        delete req.body.oldUserName;
        delete req.body.oldPassword;
        delete req.body.newPassword;
        const user = await User.updateUser(req.body);
        return res.json(user);
    } catch (err) {
        console.log(err);
        return next(err);
    }
});

/**
 * POST /connect/:userUuId => sends a connection request to another user
 * 
 * Returns a success message
 * 
 * Authorization required: login
 */
router.post("/connect/:userUuId", ensureLoggedIn, async function(req, res, next) {
    try {
        const selfUuId = res.locals.user.userUuId;
        const targetUuId = req.params.userUuId;
        const check = await UserUserJoins.checkIfConnected(selfUuId, targetUuId);
        if (!check) {
            const connect = await User.inviteUser(selfUuId, targetUuId);
            if (connect) return res.json({ message: "invite sent" });
        }
        if (check.dataValues.targetUuId == selfUuId && !check.dataValues.accepted) {
            const connect = await User.acceptUser(selfUuId, targetUuId);
            if (connect) return res.json({ message: "invite accepted" });
        }
        throw new BadRequestError("A connection request already exists");
    } catch (err) {
        console.log(`An error has occured ${err}`)
        return next(err);
    }
});

/**
 * DELETE /connect/:userUuId => sends a command to terminate this connection
 * 
 * Returns a success message
 * 
 * Authorization required: login
 */
router.delete("/connect/:userUuId", ensureLoggedIn, async function(req, res, next) {
    try {
        const selfUuId = res.locals.user.userUuId;
        const targetUuId = req.params.userUuId;
        const result = await User.removeConnection(selfUuId, targetUuId);
        return res.json(result);
    } catch (err) {
        return next(err);
    }
})



module.exports = router;