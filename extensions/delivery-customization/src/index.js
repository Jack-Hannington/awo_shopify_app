export * from './renameDelivery.js';
export * from './hideDelivery.js';
export * from './run.js';

// Find customisations for DeliveryMethod
// query {
//     deliveryCustomizations(first: 25) {
//       edges {
//         node {
//           id
//           title
//           enabled
//           functionId
//         }
//       }
//     }
//   }