// Customer ke QR Order submit function ke andar:
const handleCustomerPlaceOrder = async () => {
  if (cart.length === 0) return;
  setLoading(true);

  try {
    // 1. Check karein ki Table par pehle se koi active unpaid order hai ya nahi
    const { data: existingOrders, error: fetchErr } = await supabase
      .from("orders")
      .select("*")
      .eq("table_number", tableNumber) // e.g. "T-1"
      .neq("status", "Completed")
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingOrders && existingOrders.length > 0) {
      // Round 2 detected! Purane order mein naye items jod do
      const existingOrder = existingOrders[0];
      const currentItems = Array.isArray(existingOrder.items) ? existingOrder.items : [];

      // Purane items aur naye cart items ko combine karein
      const combinedItems = [...currentItems];
      cart.forEach((newCartItem) => {
        const itemIdx = combinedItems.findIndex((i: any) => i.name === newCartItem.name);
        if (itemIdx > -1) {
          combinedItems[itemIdx].quantity = Number(combinedItems[itemIdx].quantity) + newCartItem.quantity;
        } else {
          combinedItems.push({
            name: newCartItem.name,
            quantity: newCartItem.quantity,
            price: newCartItem.price,
          });
        }
      });

      // Naya grand total calculate karein
      const newSubtotal = combinedItems.reduce((sum: number, it: any) => sum + it.price * it.quantity, 0);
      const newGrandTotal = Math.round(newSubtotal * 1.05);

      // Usi table order ko Supabase mein update karein
      await supabase
        .from("orders")
        .update({
          items: combinedItems,
          total_amount: newGrandTotal,
          status: "Pending", // Kitchen ko alert chala jayega naye item ka
        })
        .eq("id", existingOrder.id);

      alert("Aapka naya order (Chai) aapke table bill mein jod diya gaya hai!");
    } else {
      // Round 1 (Naya fresh order)
      const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
      const grandTotal = Math.round(subtotal * 1.05);

      await supabase.from("orders").insert([
        {
          table_number: tableNumber,
          items: cart.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          status: "Pending",
          total_amount: grandTotal,
          payment_mode: "Pending",
        },
      ]);

      alert("Order kitchen ko bhej diya gaya hai!");
    }

    setCart([]);
  } catch (err) {
    alert("Order place karne mein problem aayi");
  } finally {
    setLoading(false);
  }
};