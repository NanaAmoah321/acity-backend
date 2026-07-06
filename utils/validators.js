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