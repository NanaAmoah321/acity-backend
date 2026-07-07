const pool = require("../config/db");

exports.toggleFollow = async (req, res) => {

    const follower_id = req.user.id;

    const { following_user_id } = req.body;

    if(follower_id == following_user_id){

        return res.status(400).json({

            error:"You cannot follow yourself."

        });

    }

    try{

        const existing =
        await pool.query(

            `
            SELECT id

            FROM store_followers

            WHERE
                follower_id = $1
            AND
                following_user_id = $2
            `,

            [

                follower_id,

                following_user_id

            ]

        );

        if(existing.rows.length){

            await pool.query(

                `
                DELETE FROM store_followers

                WHERE
                    follower_id = $1
                AND
                    following_user_id = $2
                `,

                [

                    follower_id,

                    following_user_id

                ]

            );

            return res.json({

                following:false,

                message:"Store unfollowed."

            });

        }

        await pool.query(

            `
            INSERT INTO store_followers
            (
                follower_id,
                following_user_id
            )
            VALUES
            (
                $1,
                $2
            )
            `,

            [

                follower_id,

                following_user_id

            ]

        );

        res.json({

            following:true,

            message:"Store followed."

        });

    }catch(err){

        res.status(500).json({

            error:err.message

        });

    }

};

exports.getFollowStatus = async (req, res) => {

    const follower_id = req.user.id;

    const following_user_id =
    req.params.userId;

    try{

        const result =
        await pool.query(

            `
            SELECT id

            FROM store_followers

            WHERE
                follower_id = $1
            AND
                following_user_id = $2
            `,

            [

                follower_id,

                following_user_id

            ]

        );

        res.json({

            following:
            result.rows.length > 0

        });

    }catch(err){

        res.status(500).json({

            error:err.message

        });

    }

};