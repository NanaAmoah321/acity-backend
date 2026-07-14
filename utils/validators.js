exports.validateListing = ({
    title,
    description,
    category,
    price,
    stock_quantity
}) => {

    if(
        !title ||
        title.trim().length < 3
    ){

        return "Title must be at least 3 characters.";

    }

    if(
        title.length > 100
    ){

        return "Title is too long.";

    }

    if(
        !description ||
        description.trim().length < 10
    ){

        return "Description is too short.";

    }

    if(
        description.length > 2000
    ){

        return "Description is too long.";

    }

    if(
        Number(price) <= 0
    ){

        return "Price must be greater than zero.";

    }

    if(
        !Number.isInteger(
            Number(stock_quantity)
        ) ||
        Number(stock_quantity) < 1
    ){

        return "Invalid stock quantity.";

    }

    return null;

};

exports.validateMessage = ({
    message
}) => {

    if(
        !message ||
        !message.trim()
    ){

        return "Message cannot be empty.";

    }

    if(
        message.length > 5000
    ){

        return "Message is too long.";

    }

    return null;

};

exports.validateReview = ({
    rating,
    comment
}) => {

    const score =
    Number(rating);

    if(
        score < 1 ||
        score > 5
    ){

        return "Rating must be between 1 and 5.";

    }

    if(
        comment &&
        comment.length > 1000
    ){

        return "Review is too long.";

    }

    return null;

};

exports.validateService = ({
    title,
    description,
    category,
    rate
}) => {

    if(
        !title ||
        title.trim().length < 3
    ){

        return "Title must be at least 3 characters.";

    }

    if(
        title.length > 100
    ){

        return "Title is too long.";

    }

    if(
        !description ||
        description.trim().length < 10
    ){

        return "Description is too short.";

    }

    if(
        description.length > 2000
    ){

        return "Description is too long.";

    }

    if(
        !category ||
        !category.trim()
    ){

        return "Please select a category.";

    }

    if(
        Number(rate) <= 0
    ){

        return "Rate must be greater than zero.";

    }

    return null;

};

exports.validateOrder = ({
    quantity,
    delivery_method,
    room_number
}) => {

    if(
        !Number.isInteger(
            Number(quantity)
        ) ||
        Number(quantity) < 1
    ){

        return "Quantity must be at least 1.";

    }

    const allowedMethods = [

        "meetup",

        "hostel"

    ];

    if(
        !allowedMethods.includes(
            delivery_method
        )
    ){

        return "INVALID METHOD TEST.";

    }

    if(

        delivery_method === "hostel"

        &&

        (
            !room_number ||
            !room_number.trim()
        )

    ){

        return "Room number is required for hostel delivery.";

    }

    return null;

};