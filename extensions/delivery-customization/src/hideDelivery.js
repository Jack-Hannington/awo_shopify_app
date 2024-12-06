// @ts-check

/**
* @typedef {import("../generated/api").RunInput} RunInput
* @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
* @typedef {import("../generated/api").Operation} Operation
*/

import postcodes from './local_postcodes.json';
import redZones from './red_zones.json';

const configuration = {
  lowValueThreshold: 15000 // £150 in pence
};

function isLocalPostcode(customerPostcode) {
  if (!customerPostcode) return false;
  
  // Convert to uppercase and remove spaces for consistent comparison
  const formattedPostcode = customerPostcode.toUpperCase().replace(/\s/g, '');
  
  // Check if the postcode starts with any of our local postcodes
  return postcodes.some(entry => 
    formattedPostcode.startsWith(entry.Postcode)
  );
}

function isRedZonePostcode(customerPostcode) {
  if (!customerPostcode) return false;
  
  // Convert to uppercase and remove spaces for consistent comparison
  const formattedPostcode = customerPostcode.toUpperCase().replace(/\s/g, '');
  
  // Check if the postcode starts with any of our red zone postcodes
  return redZones.some(entry => 
    formattedPostcode.startsWith(entry.Postcode)
  );
}

export function hideRun(input) {
  const customerPostcode = input.cart.deliveryGroups[0]?.deliveryAddress?.zip;
  const cartTotal = input.cart.lines.reduce((total, line) => 
    total + (parseFloat(line.cost.totalAmount.amount) * 100 || 0), 0);
  
  const allOptions = input.cart.deliveryGroups[0]?.deliveryOptions ?? [];
  
  const isLocal = isLocalPostcode(customerPostcode);
  const isNonLocal = !isLocal;
  const isRedZone = isRedZonePostcode(customerPostcode);
  
  const hasLargeAppliance = input.cart.lines.some(line => {
    if ('product' in line.merchandise) {
      const productType = line.merchandise.product?.productType?.toLowerCase() ?? '';
      return productType === 'range cooker' || productType === 'american fridge freezer';
    }
    return false;
  });

  const requiresSteps = input.cart.requiresStepsAttribute?.value === 'yes';
  const hasInstallationTag = input.cart.lines.some(line => {
    if ('product' in line.merchandise) {
      return line.merchandise.product?.hasAnyTag ?? false;
    }
    return false;
  });
  const hasInstallationAttribute = input.cart.hasService?.value === 'true';
  const hasInstallation = hasInstallationTag || hasInstallationAttribute;

  // Helper function to hide all except specified options
  const hideAllExcept = (optionsToKeep) => {
    return allOptions
      .filter(option => !optionsToKeep.includes(option.title))
      .map(option => /** @type {Operation} */({
        hide: { deliveryOptionHandle: option.handle }
      }));
  };

  // Condition 1: Remote Delivery
  if (isRedZone) {
    return { operations: hideAllExcept(["Remote delivery"]) };
  }
  // Large appliance delivery check (before AIT check)
  if (hasLargeAppliance) {
    if (isNonLocal) {
      return { operations: hideAllExcept(["AIT 2 man courier service"]) };
    }
    if (isLocal) {
      return { operations: hideAllExcept(["Appliance World 2 man delivery"]) };
    }
  }

    // Condition 2: Cart under £150
    if (cartTotal < configuration.lowValueThreshold) {
      return { operations: hideAllExcept(["DPD tracked 24-48hr delivery"]) };
  }




  //if installation and non-local show AIT only
  const AitDelivery = hasInstallation && isNonLocal;
  
  if (AitDelivery) {
    return { operations: hideAllExcept(["AIT 2 man courier service"]) };
  }

  // Add check for non-local with steps
  if (isNonLocal && requiresSteps) {
    return { operations: hideAllExcept(["AIT 2 man courier service"]) };
  }


  const hasOutOfStockItem = input.cart.lines.some(line => {
    const inventoryStatus = line.attribute?.value;
    return inventoryStatus === 'out_of_stock';
  });

  // Out of stock
  if (hasOutOfStockItem) {
    return { operations: hideAllExcept(["Available to order: We will contact you to arrange delivery"]) };
  }

   // Condition 3: They selected collection
   const isCollection = input.cart.shippingMethodAttribute?.value === 'collection';
  
   if (isCollection) {
    return { operations: hideAllExcept(["Collect from Trafford Park"]) };
  }

  // if local and up stairs
  if (isLocal && requiresSteps) {
    return { operations: hideAllExcept(["Appliance World 2 man delivery"]) };
  }

  // if local and no stairs 
  if (isLocal && !requiresSteps) {
    return { operations: hideAllExcept(["Appliance World 1 man delivery", "Appliance World 2 man delivery"]) };
  }
  
  // Condition 4: Default case 
  return { operations: hideAllExcept(["Appliance World 1 man delivery", "AIT 2 man courier service"]) };
}