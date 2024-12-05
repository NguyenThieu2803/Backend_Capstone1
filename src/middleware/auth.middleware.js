const jwt = require('jsonwebtoken');
const User = require('../model/Usermodel/User');



const authmiddlewareControll = {
    //verify user is authenticated
    verifyUser: async (req,res,next) => {
        const token = req.headers.authorization
        console.log(token)
        if(token) {
            try {
                const accessToken = token.split(' ')[1]
                jwt.verify(accessToken, process.env.JWT_ACCESS_KEY, (err, decoded) => {
                    if(err) {
                        return res.status(403).json({message: 'token not valid'})
                    }
                    
                    // Add debug logging
                    console.log("Decoded token:", decoded);
                    
                    if (!decoded.id || decoded.role === undefined) {
                        return res.status(403).json({message: 'Invalid token payload'});
                    }
                    
                    req.user = {
                        id: decoded.id,
                        role: decoded.role
                    };
                    
                    console.log("User data in request:", req.user);
                    
                    next();
                });
            } catch (error) {   
                return res.status(500).json("error", error)
            }

        }
        else {
            return res.status(401).json({message: 'No access token, authorization denied'})
        }

    },
    //verify admin is authenticated
    verifyUserandAdmin: async (req, res, next) => {
        try {
            // First verify the user's token
            authmiddlewareControll.verifyUser(req, res, async () => {
                // Check if user exists and has admin role (role = 0)
                console.log("role:",req.user.role)
                if (req.user && req.user.role === 0) {
                    next();
                } else {
                    return res.status(403).json({
                        message: 'Access denied. Admin privileges required.'
                    });
                }
            });
        } catch (error) {
            return res.status(500).json({
                message: 'Server error',
                error: error.message
            });
        }
    }
}


module.exports = authmiddlewareControll