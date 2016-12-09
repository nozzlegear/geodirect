declare const emit: any;
declare const sum: any;

// Map function
const map = (function (doc) {
    emit(doc.geodirect_id);
})

// Reduce function
const reduce = (function (keys, values, rereduce) {
    if (rereduce) {
        return sum(values);
    }

    return values.length;
});

export { map, reduce };