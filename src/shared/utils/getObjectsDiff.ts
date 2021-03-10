import _ from "lodash";

/**
 * Deep diff between two object, using lodash
 * https://gist.github.com/Yimiprod/7ee176597fef230d1451
 * @param  {Object} object Object compared
 * @param  {Object} base   Object to compare with
 * @return {Object}        Return a new object who represent the diff
 */
export default function getObjectDiff(object: any, base: any): any {
  function changes(object: any, base: any): any {
    return _.transform(object, function (result, value, key) {
      if (!_.isEqual(value, base[key])) {
        result[key] =
          _.isObject(value) && _.isObject(base[key])
            ? changes(value, base[key])
            : value;
      }
    });
  }

  const removed = changes(object, base);
  const added = changes(base, object);
  return _.merge({}, removed, added);
}
