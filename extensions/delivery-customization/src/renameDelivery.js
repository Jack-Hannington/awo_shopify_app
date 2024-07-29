// @ts-check

// 14f51bc1-af23-4a63-bde4-d2e70a857b6a
// gid://shopify/DeliveryCustomization/13336646
// Use JSDoc annotations for type safety
/**
* @typedef {import("../generated/api").RunInput} RunInput
* @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
* @typedef {import("../generated/api").Operation} Operation
*/


// The configured entrypoint for the 'purchase.delivery-customization.run' extension target
/**
* @param {RunInput} input
* @returns {FunctionRunResult}
*/
export function renameDelivery(input) {
  // The message to be added to the delivery option
  const message = "Ships in 5-10 days. We will contact you to confirm.";

  let toRename = input.cart.deliveryGroups
    // Filter for delivery groups with a shipping address containing the affected state or province
    .filter(group => group.deliveryAddress?.zip &&
      // Use the configured province code instead of a hardcoded value
      group.deliveryAddress.zip.startsWith("1111"))
    // Collect the delivery options from these groups
    .flatMap(group => group.deliveryOptions)
    // Construct a rename operation for each, adding the message to the option title
    .map(option => /** @type {Operation} */({
      rename: {
        deliveryOptionHandle: option.handle,
        title: option.title ? `${option.title} - ${message}` : message
      }
    }));

  // The @shopify/shopify_function package applies JSON.stringify() to your function result
  // and writes it to STDOUT
  return {
    operations: toRename
  };
};
