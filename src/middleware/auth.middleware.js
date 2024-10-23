const jwt = require('jsonwebtoken');
const User = require('../model/Usermodel/User');



const authmiddlewareControll = {
    //verify user is authenticated
    verifyUser: async (req,res,next) => {
        const token = req.headers.authorization
        console.log(token)
        if(token) {
            try {
                const accestoken = token.split(' ')[1]
                jwt.verify(accestoken,process.env.JWT_ACCESS_KEY,(err,User) => {
                    if(err) {
                        return res.status(403).json({message: 'token not valid'})
                    }
                    console.log(User)
                    req.user = User;
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
    verifyUserandAdmin: (req, res) => {
        authmiddlewareControll.verifyUser(req, res,()=>{
            if(req.user._id === User._id || User.admin){
                next();
            }else{
                res.status(403).json({message: 'You not allowed to access this'})
            }
        })
    }
}


module.exports = authmiddlewareControll