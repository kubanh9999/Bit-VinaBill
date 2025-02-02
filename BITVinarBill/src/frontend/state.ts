import { atom, selector, selectorFamily } from "recoil";
import { getPhoneNumber, getUserInfo, getAccessToken } from "zmp-sdk";
import logo from "static/phuminhtam_logo.jpg";
import { Product, Variant } from "types/product";
import { Cart } from "types/cart";
import { News } from "types/news";
import { NewsService } from "api/services/news.service";
import { calcFinalPrice } from "utils/product";
import { Order } from "types/order";
import { VariantService } from "api/services/variant.service";
import { CategoryService } from "api/services/category.service";
import { ProductService } from "api/services/product.service";
import { OrderService } from "api/services/order.service";
import { UserInforService } from "api/services/user-infor.service";
import { CreateOrderRequest } from "types/CreateOrderRequest";
import { PaymentForOrder } from "types/payment";
import { getStorage, setStorage, requestSendNotification } from "zmp-sdk/apis";
import { Auth } from "types/auth";
import { Customer } from "types/customer";
import { Discount } from "types/discount";
import { CustomerService } from "api/services/customer.service";

export const getPhonenumber = async (accessToken) => {
  var phoneCode = await getPhoneNumber();
  var phone_number = (await UserInforService.get(accessToken, phoneCode))?.data
    ?.data?.number;
  if (phone_number) {
    return phone_number;
  }
  return;
};

export const phoneState = selector({
  key: "phoneState",
  get: async () => {
    try {
      const token = await getPhoneNumber();
      
      return token.token;
    } catch (error) {
      console.error("Error fetching access token:", error);
      return null;
    }
  },
});

export const userInfoState = selector({
  key: "userInfo",
  get: async () => {
    try {
      const userInfoResponse = await getUserInfo();

      const userId = userInfoResponse?.userInfo?.id;
      const userName = userInfoResponse?.userInfo?.name;
      console.log("User123 : ", userId, "Name : ", userName);

      if (userId && userName) {
        return {
          userId,
          userName,
        };
      } else {
        console.warn("Some user info fields are missing.");
        return null;
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
      return null;
    }
  },
});

// -----------------------ZALO OA----------------------------------



export const sendNotification = async () => {
  try {
    await requestSendNotification({});
  } catch (error) {
    console.log(error);
  }
};

// ----------------------------------------------------------------

// ----------------------------------------------------------------
getUserInfo({
  success: (data) => {
    const { userInfo } = data;
    return userInfo;
  },
  fail: (error) => {
    console.error("Error fetching user info:", error);
  },
});


export const userState = selector({
  key: "user",
  get: async () => {
    try {
      const { userInfo } = await getUserInfo({ autoRequestPermission: true });
      return userInfo;
    } catch (error) {
      return {
        id: "",
        avatar: "",
        name: "Người dùng Zalo",
      };
    }
  },
});

// const getUserCurrent = async () => {
//   var userInfor = { ...(await getUserInfo()).userInfo };
//   await getAccessToken();
//   return userInfor;
// };

export const getUserCurrent = async (): Promise<Customer> => {
  const { userInfo } = await getUserInfo();
  await getAccessToken();

  const userFromDb = await CustomerService.getById(userInfo.id)
  
  console.log("Co khong ", !userFromDb);
  

  if (!userFromDb) {
    const name = userInfo.name || "";
    const phone_number = "";

    return {
      id: userInfo.id,
      name,
      phone_number,
    };
  }
  return {
    id: userFromDb.id,
    name: userFromDb.name,
    phone_number: userFromDb.phone_number,
  };

};
export const newsState = selector<any>({
  key: "news",
  get: async () => {
    return await NewsService.getAll();
  },
});
export const userCurrentAtom = atom<Customer>({
  key: "userCurrentAtom",
  // default: getUserCurrent() as Promise<Customer>,
  default: {} as Promise<Customer>,
});

export const userCurrentState = selector({
  key: "userCurrentState",
  get: ({ get }) => get(userCurrentAtom),
});;

// ----------------------------------------------------------------
export const requestPhoneTriesState = atom({
  key: "requestPhoneTries",
  default: 0,
});

export const phoneNumerState = atom({
  key: "phoneNumber",
  default: "",
});

export const accessTokenState = selector({
  key: "accessTokenState",
  get: async () => {
    try {
      const accessToken = await getAccessToken();
      return accessToken;
    } catch (error) {
      console.error("Error fetching access token:", error);
      return null;
    }
  },
});



export const selectedAddressState = atom<string>({
  key: "selectedAddressState",
  default: "",
});

export const categoriesState = selector<any>({
  key: "categories",
  get: async () => {
    return await CategoryService.getAll();
  },
});

export const variantState = selector<any>({
  key: "variants",
  get: async () => {
    return await VariantService.getAll();
  },
});

// export const productsState = selector<Product[]>({
//   key: "products",
//   get: async ({ get }) => {
//     const products = await ProductService.getAll();
// console.log('products',products);

//     const variants = get(variantState);

//     return products.map(
//       (product) =>
//       ({
//         ...product,
//         variants: variants.filter((variant) =>
//           product.variantId.includes(variant.id)
//         ),
//       } as Product)
//     );
//   },
// });
export const productsState = selector<Product[]>({
  key: "products",
  get: async ({ get }) => {
    const products = await ProductService.getAll();
    console.log('products', products);

    const variants = get(variantState);

    // Áp dụng map để bổ sung variants và sau đó đảo ngược thứ tự
    const updatedProducts = products.map(
      (product) =>
      ({
        ...product,
        variants: variants.filter((variant) =>
          product.variantId.includes(variant.id)
        ),
      } as Product)
    );

    // Đảo ngược thứ tự của danh sách sản phẩm
    return updatedProducts.reverse();
  },
});


export const ordersState = selector<Order[]>({
  key: "orders",
  get: async () => {
    var orders = await OrderService.getAll();
    return orders.map((order, index) => {
      return { ...order, payment_status: index > 1 ? "PENDING" : "APPROVED" };
    }) as Order[];
  },
});

export const selectedProductState = atom({
  key: "selectedProduct",
  default: {} as Product,
});

export const recommendProductsState = selector<Product[]>({
  key: "recommendProducts",
  get: ({ get }) => {
    const products = get(productsState);
    const recommend = products.filter(products => products.isFeatured === true);

    return recommend.length > 0 ? [...new Array(3)].map(
      () => recommend[Math.floor(Math.random() * recommend.length)]
    ) : [];
  },
});

export const selectedCategoryIdState = atom({
  key: "selectedCategoryId",
  default: "coffee",
});

export const productsByCategoryState = selector({
  key: "productsByCategory",
  get: ({ get }) => {
    const products = get(productsState);

    return products.filter((val) =>
      val.categoryId.includes(get(selectedCategoryIdState))
    );
  },
});

export const authenticationState = atom<Auth>({
  key: "authentication",
  default: getStorage({
    keys: ["authentication"],
  }).then((data) => data?.authentication || {}),
});

export const cartState = atom<Cart>({
  key: "cart",
  default: getStorage({
    keys: ["cart"],
  }).then((data) => data?.cart || []),
});

export const cartStorageState = selector({
  key: "cartStorageState",
  get: ({ get }) => {
    const cart = get(cartState);
    setStorage({
      data: {
        cart: cart,
      },
    });
  },
});

export const orderState = selector<Order>({
  key: "order",
  get: async ({ get }) => await OrderService.getByUserId(get(userState).id),
});

export const totalQuantityState = selector({
  key: "totalQuantity",
  get: ({ get }) => {
    const cart = get(cartState);
    return cart.reduce((total, item) => total + item.quantity, 0);
  },
});

export const paymentResultState = atom<any>({
  key: "paymentResult",
  default: "",
});

export const invoiceState = atom<CreateOrderRequest>({
  key: "invoiceState",
  default: {} as CreateOrderRequest,
});

export const paymentState = atom<PaymentForOrder>({
  key: "payment",
  default: {} as PaymentForOrder,
});

export const paymentSelector = selector({
  key: "paymentSelector",
  get: async ({ get }) => {
    const order = get(invoiceState);
    const paymentStatus = get(paymentResultState);
    const payment = get(paymentState);
    const createOrder = async () => {
      if (order && order.customer_id) {
        if (paymentStatus === "SUCCESS" || paymentStatus === "PENDING") {
          const orderResult = await OrderService.create(order);
          console.log("Order result: ", orderResult);
          if (orderResult) {
            OrderService.createPayment(payment);
          }
        }
      }
    };
    return createOrder();
  },
});


export const keywordState = atom({
  key: "keyword",
  default: "",
});

export const resultState = selector<Product[]>({
  key: "result",
  get: async ({ get }) => {
    const keyword = get(keywordState);
    if (!keyword.trim()) {
      return [];
    }
    const products = get(productsState);
    return products.filter((product) =>
      product.name.trim().toLowerCase().includes(keyword.trim().toLowerCase())
    );
  },
});

export const selectedDeliveryTimeState = atom({
  key: "selectedDeliveryTime",
  default: +new Date(),
});

export const orderNoteState = atom({
  key: "orderNote",
  default: "",
});

export const tempTotalPriceState = selector({
  key: "tempTotalPriceState",
  get: ({ get }) => {
    const cart = get(cartState);
    const cartPrice = cart.reduce(
      (total, item) =>
        total + item.quantity * calcFinalPrice(item.product, item.options),
      0
    );

    return cartPrice;
  },
});

export const discountValueState = selector({
  key: "discountValueState",
  get: ({ get }) => {
    const total = get(tempTotalPriceState);
    const discounts: Discount[] = get(selectedDiscountToOrderState);

    const total_discount = discounts.reduce((sum, d: Discount) => {
      if (d.type === "percent") {
        return sum + (total * (d.value ?? 0)) / 100;
      } else {
        return sum + (d.value ?? 0);
      }
    }, 0);

    return Math.min(total, total_discount);
  },
});

export const totalPriceState = selector({
  key: "totalPriceState",
  get: ({ get }) => {
    const tempTotalPrice = get(tempTotalPriceState);
    console.log("tempTotalPrice:",tempTotalPrice);

    const validTempTotalPrice = isNaN(tempTotalPrice) ? 0 : tempTotalPrice;

    let discountValue = get(discountValueState);
    console.log("discountValue:",discountValue);
    
    const validDiscountValue = isNaN(discountValue) ? 0 : discountValue;
    const discounts = get(selectedDiscountToOrderState);
    console.log("discountValue:",discountValue);
    (discounts[0] as Discount)?.conditions?.map((condition) => {
      return (discountValue =
        condition.conditionType === "MAX_DISCOUNT_VALUE" &&
          condition.value < discountValue
          ? condition.value
          : discountValue);
    });

    return validTempTotalPrice - validDiscountValue;
  },
});

export const selectedDiscountToOrderState = atom({
  key: "selectedDiscountToOrderState",
  default: [],
});

export const discountState = atom<Discount[]>({
  key: "discountState",
  default: [],
});
