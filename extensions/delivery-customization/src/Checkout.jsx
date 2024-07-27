import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Text,
  DatePicker,
  BlockSpacer,
  Banner,
  useApplyMetafieldsChange,
  useDeliveryGroups,
  useApi,
  reactExtension,
  useShippingAddress,
} from "@shopify/ui-extensions-react/checkout";



// Create object based on postcode and cart items. If installation and non-local only show Panther. If removal 
// If installation and postcode is not local then hide date picker only show panther. 
// Hide date picker if cart has installation and postcode not local which we can get from the API.
// Show 2 person express delivery option with 3+ steps only.
// Show collection if non-installation 
// Ships in 5-10 days. We will contact you to confirm the date.
// Delivery surcharge for remote postcodes - £60. 
// https://claude.ai/chat/a030fd15-479b-4b58-9e1d-9b2fafd88df3

reactExtension("purchase.checkout.shipping-option-list.render-after", () => (
  <Extension />
));

export default function Extension() {
  const [selectedDate, setSelectedDate] = useState("");
  const [availableDates, setAvailableDates] = useState([]);
  const [yesterday, setYesterday] = useState("");

  const { extension } = useApi();
  const { target } = extension;

  const deliveryGroups = useDeliveryGroups();
  const shippingAddress = useShippingAddress();

  // Set a function to handle updating a metafield
  const applyMetafieldsChange = useApplyMetafieldsChange();

  // Define the metafield namespace and key
  const metafieldNamespace = "deliveryApp";
  const metafieldKey = "deliverySchedule";

  // Function to fetch available dates based on postcode
  const fetchAvailableDates = async (postcode) => {
    try {
      const response = await fetch(`https://awodeliverydates-production.up.railway.app/getdeliverydates?postcode=${postcode}`);
      const data = await response.json();
      const currentYear = new Date().getFullYear();
      const availableDates = data.dates.map(dateStr => new Date(Date.parse(`${dateStr} ${currentYear} GMT`)));
      setAvailableDates(availableDates);
  
      // Set the first available date as the selected date
      if (availableDates.length > 0) {
        setSelectedDate(formatDate(availableDates[0]));
      } else {
        setSelectedDate(""); // No available dates
      }
  
      // Set yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      setYesterday(formatDate(yesterday));
    } catch (error) {
      console.error("Error fetching available dates:", error);
    }
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return "No date selected";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  useEffect(() => {
    if (!shippingAddress) return;
  
    const postcode = shippingAddress?.zip;
  
    if (postcode) {
      fetchAvailableDates(postcode);
    }
  }, [shippingAddress, setSelectedDate, setYesterday]);

  // Sets the selected date to today, unless today is Sunday, then it sets it to tomorrow
  useMemo(() => {
    let today = new Date();

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    let deliveryDate;
    if (today.getDay() === 0) {
      deliveryDate = tomorrow;
    } else {
      deliveryDate = today;
    }

    setSelectedDate(formatDate(deliveryDate));
    setYesterday(formatDate(yesterday));
  }, []);

  // Helper function to check if a date is in the list of available dates
  const isDateAvailable = (date, availableDates) => {
    const formattedDate = formatDate(date);
    return availableDates.some(availableDate => formatDate(availableDate) === formattedDate);
  };

  // Generate the disabled date ranges based on available dates
  const generateDisabledRanges = (availableDates) => {
    const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = new Date(new Date().setMonth(new Date().getMonth() + 3));
    const disabledRanges = [];

    let currentStart = startDate;
    while (currentStart <= endDate) {
      if (!isDateAvailable(currentStart, availableDates)) {
        let currentEnd = new Date(currentStart);
        while (!isDateAvailable(currentEnd, availableDates) && currentEnd <= endDate) {
          currentEnd.setDate(currentEnd.getDate() + 1);
        }
        disabledRanges.push({ start: formatDate(new Date(currentStart)), end: formatDate(new Date(currentEnd.setDate(currentEnd.getDate() - 1))) });
        currentStart = new Date(currentEnd);
        currentStart.setDate(currentStart.getDate() + 1);
      } else {
        currentStart.setDate(currentStart.getDate() + 1);
      }
    }

    // Add a disabled range for dates after the last available date
    if (availableDates.length > 0) {
      const lastAvailableDate = availableDates[availableDates.length - 1];
      const dayAfterLastAvailableDate = new Date(lastAvailableDate);
      dayAfterLastAvailableDate.setDate(lastAvailableDate.getDate() + 1);
      disabledRanges.push({ start: formatDate(dayAfterLastAvailableDate) });
    }

    return disabledRanges;
  };

  const disabledRanges = useMemo(() => generateDisabledRanges(availableDates), [availableDates]);

  // Set a function to handle the Date Picker component's onChange event
  const handleChangeDate = useCallback(
    (selectedDate) => {
      setSelectedDate(selectedDate);
      // Apply the change to the metafield
      applyMetafieldsChange({
        type: "updateMetafield",
        namespace: metafieldNamespace,
        key: metafieldKey,
        valueType: "string",
        value: selectedDate,
      });
    },
    [applyMetafieldsChange]
  );

  // Boolean to check if Express is selected
  const isExpressSelected = () => {
    if (
      target !== "purchase.checkout.shipping-option-list.render-after" ||
      !deliveryGroups ||
      deliveryGroups.length === 0
    ) {
      return false;
    }

    const expressHandle = deliveryGroups[0].deliveryOptions.find(
      (method) => method.title === "Choice of date"
    )?.handle;

    return expressHandle === deliveryGroups[0].selectedDeliveryOption?.handle;
  };

  // Render the extension components if Express is selected
  return isExpressSelected() ? (
    <>
      <Text variant="bodyLg" as="p">
        Select a date for delivery
      </Text>
      <DatePicker
        selected={selectedDate}
        onChange={handleChangeDate}
        disabled={[...disabledRanges, { end: yesterday }]}
      />
      <BlockSpacer />
      <Banner status="success">
        Deliver on: {`${formatDisplayDate(selectedDate)}.`}
      </Banner>
    </>
  ) : null;
}

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
