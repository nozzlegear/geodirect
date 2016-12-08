declare const emit: any;

// Map function
export function map (doc) {
  emit(doc.shop_id, {geodirect_id: doc.geodirect_id});
}

// Reduce
export function reduce (keys, values, rereduce) {
    if (!rereduce) {
        // Keys: an array whose elements are arrays of the form [key,id], where key is a key emitted by the map function and id is that of the document from which the key was generated. 
        // Value: an array of the values emitted for the respective elements in keys
        // i.e. reduce([ [shop_id,log_id], [shop_id2,log_id2], [shop_id3,log_id3] ], [{geodirect_id:a},{geodirect_id:b},{geodirect_id:c}], false)
        var record = values.reduce(function (output, log, index) {
            var id = log.geodirect_id;

            output[id] = 1;
            output.keys.push(id);

            return output;
        }, {keys: []});

        return record;
    } else {
        // Key: will be null.
        // Value: an array of values returned by previous calls to the reduce function 
        // i.e. reduce(null, [{id1: 1, id2: 1, id3: 1, keys:[id1, id2, id3]},{id1: 1, id2: 1, id3: 1}, {id1: 1, id2: 1, id3: 1}], true)
        // We want to sum up all of the id1s and return {id1: 5, id2: 10, id3: 20}

        var result = values.reduce(function (output, record, index) {
            record.keys.forEach(function (key) {
                output[key] = output[key] ? (output[key] + 1) : 1;
            })

            return output;
        }, {})

        return result;
    }
}