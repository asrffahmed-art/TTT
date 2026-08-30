# `pixel`
Paymob Web SDK, help our merchant to have the native payment experience.

## Installing

<!-- ### Package manager

Using npm:

```bash
$ npm install paymob-pixel --save
```

Once the package is installed, you can import the library using `import`:

```js
import { Pixel } from 'paymob-pixel';
``` -->

### CDN

Using jsDelivr:

```html
<script src="https://cdn.jsdelivr.net/npm/paymob-pixel@latest/main.js" type="module"></script>
```

> **Self-contained:** `main.js` is the only file you need — all styles, fonts and
> icons are inlined into it and injected into the SDK's Shadow DOM at runtime.
> There are no separate CSS files to include. This also means the SDK works when
> imported into a bundler (React/Angular/Vue) — see
> [Use in a framework](#use-in-a-framework-react-angular-vue).

<!-- Using unpkg:

```html
<link rel="stylesheet" href="https://unpkg.com/paymob-pixel/styles.css">
<link rel="stylesheet" href="https://unpkg.com/paymob-pixel/main.css">
<script src="https://unpkg.com/paymob-pixel/main.js" type="module"></script>
``` -->

## Usage

```js
new Pixel({
    publicKey: 'are_pk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    clientSecret: 'are_csk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    paymentMethods: ['card', 'google-pay', 'apple-pay'],
    elementId: 'example'
});
```

> **Note**: If Google Pay is passed as Payment Method , you must include Google Pay SDK
> ```html
> <script src="https://pay.google.com/gp/p/js/pay.js"></script>
> ```

## Properties

The full list of properties is as follows:
| Property  | Type | Definition |
| --------------------- | --------------  | --------------  |
| publicKey             | String          | It can be accessed from Merchant’s Dashboard → Settings → Account Info. |
| clientSecret           | String          | Once you fire Intention API, you will receive “client_secret” in the API Response , which will be used in the Pixel SDK. Client Secret is unique for each Order and it expires in an hour. |
| paymentMethods        | Array of String | Pass card for Card Payments ,google-pay for Google Pay && apple-pay for Apple Pay. | 
| elementId             | String          | ID of the HTML element where the checkout pixel will be embedded. |
| disablePay            | Boolean         | pass true If you don’t want to use Paymob’s Pay Button for Card Payment, in this case you will dispatchEvent with name (payFromOutside) to fire the pay.  |
| showSaveCard          | Boolean         | If this option is set to TRUE, users will have the option to save their card details for future payment.  |
| forceSaveCard         | Boolean         | If this option is set to true, the user's card details will be saved automatically without requiring their consent  |
| cardValidationChanged | Function        | This Functionality will be processed whenever card validation status changed.  |
| beforePaymentComplete | Function        | Merchants can implement their own custom logic or functions before the payment is processed by Paymob. check the full example below.  |
| afterPaymentComplete  | Function        | This Functionality will be processed after payment is processed by Paymob. check the full example below. |
| onPaymentCancel       | Function        | This function applies exclusively to Apple Pay. Merchants can implement their own custom logic to handle scenarios where a user cancels the Apple Pay payment by closing the Apple Pay SDK.  |
| customStyle           | Object          | You can pass custom styles, for more details check the full example below.


## Events
The full list of events is as follows:
| Event   | Definition |
| ------- | ---------  |
| payFromOutside | In case you need to use you pay button instead of SDK pay button.


## Functions
The full list of functions is as follows:
| Function  | Props | Definition |
| --------------------- | --------------  | --------------  |
| updateIntentionData   | elementId       | Update intention data inside the SDK, in case any updates happend on the intention.


## Custom Pay Button Example
> Add **disablePay** to hide SDK pay button
> ```js
> new Pixel({
>     publicKey: 'are_pk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
>     clientSecret: 'are_csk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
>     paymentMethods: ['card', 'google-pay', 'apple-pay'],
>     elementId: 'example',
>     disablePay: true,
> });
> ```
> Then you can fire **payFromOutside** event when ever you want to start the payment, this will not work with Google-pay or Apple-pay
> ```js
> window.dispatchEvent(new Event('payFromOutside'));
> ```



## Update Intention Example
> Whenever you made any update to the intention via API, you will need to update the intention data inside the SDK.
> ```js
> const response = await Pixel.updateIntentionData();
> ```
> **updateIntentionData** will return the response of the latest retrieve intention request.
>
>> **Note**: In case you have multiple instance of Pixel within the same page, you have to pass the **elementId** to **updateIntentionData**
>> ```js
>> const response = await Pixel.updateIntentionData("example");
>> ```
>

## Full Example

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <title>Pixels</title>
        <base href="/">
        <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body>
        <div style="position: absolute; width: 80%; margin-top: 10%;" id="example"></div>
        <button id="payFromOutsideButton">Pay From Outside Button</button>
        
        <script src="https://cdn.jsdelivr.net/npm/paymob-pixel@latest/main.js" type="module"></script>
        <script>
            const button = document.getElementById('payFromOutsideButton');
            button.addEventListener('click', function () {
                // Calling pay request
                window.dispatchEvent(new Event('payFromOutside'));
            });
            onload = (event) => {
                new Pixel({
                    publicKey: 'are_pk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
                    clientSecret: 'are_csk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
                    paymentMethods: ['card', 'google-pay', 'apple-pay'],
                    elementId: 'example',
                    showSaveCard: true,
                    forceSaveCard: true,
                    disablePay: true,
                    cardValidationChanged: (isValid) => {
                        console.log("Is valid ? ", isValid)
                    },
                    beforePaymentComplete: async (paymentMethod) => {
                        console.log('Before payment start');
                        console.log('We are waiting for 5 seconds');
                        await new Promise(res => setTimeout(() => res(''),5000))
                        console.log('Before payment end');
                        return true
                    },
                    afterPaymentComplete: async (res) => {
                        console.log('After payment');
                        console.log(res)
                    },
                    onPaymentCancel: async () => {
                        console.log("====> onPaymentCancel")
                    },
                    customStyle: {
                      HideCardIcons: true,
                      HideCardLabel: true,
                      Direction: 'rtl',
                      Label_Text: {
                        cardLabel: "بيانات البطاقة",
                        savedCardsLabel: 'البطاقات المحفوطة',
                        saveCardConsentLabel: 'حفظ البطاقة',
                        cardEndingLabel: 'تنتهي بـ'
                      },
                      Placeholder_Text: {
                        holderName: 'الاسم علي البطاقة',
                        cardNumber:'رقم البطاقة',
                        expiryDate:'سنة / شهر',
                        securityCode:'(CVV) الرمز الامني'
                      },
                      Error_Text: {
                        cardNumber: {
                          required: 'مطلوب رقم البطاقة',
                          invalid: 'رقم البطاقة غير صحيح'
                        },
                        expiryDate: {
                          required: 'مطلوب تاريخ انتهاء الصلاحية',
                          invalid: 'تاريخ انتهاء الصلاحية غير صحيح'
                        },
                        securityCode: 'مطلوب الرمز الامني (CVV)',
                        holderName: 'مطلوب اسم حامل البطاقة',
                      },
                      Button_Text: {
                        viewSavedCardsBtn: 'عرض البطاقات المحفوظة',
                        addNewCardBtn: 'إضافة بطاقة جديدة',
                        payBtn: 'ادفع'
                      },
                      Hint_Text: {
                        saveCardConsentHint: 'سيتم حفظ تفاصيل البطاقة لاستخدامها في المستقبل.',
                        cvvModalTitle: 'رمز CVV',
                        cvvVisaMastercardQuestion: 'هل لديك بطاقة ماستركارد أو فيزا؟',
                        cvvVisaMastercardHint:
                          'هو رمز مكون من 3 أرقام موجود على ظهر البطاقة.',
                        cvvAmexQuestion: 'هل لديك بطاقة أمريكان إكسبريس؟',
                        cvvAmexHint:
                          'هو رمز مكون من 4 أرقام موجود في الجهة الأمامية فوق رقم البطاقة.',
                      },
                      Font_Family: 'monospace',
                      Font_Size_Label: '18',
                      Font_Size_Input_Fields: '18',
                      Font_Size_Payment_Button: '28',
                      Font_Weight_Label: 400,
                      Font_Weight_Input_Fields: 400,
                      Font_Weight_Payment_Button: 900,
                      Color_Container: '#b7ffe4',
                      Color_Border_Input_Fields: '#f00',
                      Color_Border_Payment_Button: '#f00',
                      Radius_Border: '50',
                      Color_Disabled: '#c153bf',
                      Color_Error: '#4a6',
                      Color_Primary: '#c153bf',
                      Color_Input_Fields: 'yellow',
                      Text_Color_For_Label: '#f00',
                      Text_Color_For_Payment_Button: '#f00',
                      Text_Color_For_Input_Fields: '#f00',
                      Color_For_Text_Placeholder: '#c153bf',
                      Width_of_Container: '100%',
                      Vertical_Padding: '50',
                      Vertical_Spacing_between_components: '8',
                      Container_Padding: '50'
                    }
                });
            };
        </script>
        <script src="https://pay.google.com/gp/p/js/pay.js"></script>
  </body>
</html>
```

&nbsp;

---

&nbsp;

# Use in a framework (React, Angular, Vue)

The SDK ships as a single self-contained `main.js` — styles, fonts and icons are
bundled in, so there are **no extra CSS files to import**. Loading the bundle
registers the SDK on `window.Pixel`; you then create it against a container
element from your component's lifecycle hook.

Load the bundle in either of two ways:

- **npm** — `npm install paymob-pixel`, then `import 'paymob-pixel';` (a
  side-effect import that registers `window.Pixel`).
- **CDN** — add `<script src="https://cdn.jsdelivr.net/npm/paymob-pixel@latest/main.js" type="module"></script>` once (e.g. in `index.html`); no import needed.

> The published bundle exposes the class on `window` (it does **not** provide a
> named ESM export), so always construct it as `new window.Pixel({...})`. Use a
> **unique `elementId` per instance** if you render more than one.

**TypeScript:** add this once (e.g. `paymob-pixel.d.ts`) so `window.Pixel` is typed:

```ts
declare global {
  interface Window {
    // See the Properties tables for the full option list.
    Pixel: new (options: {
      publicKey: string;
      elementId: string;
      clientSecret?: string;
      paymentMethods?: string[];
      [option: string]: unknown;
    }) => unknown;
  }
}

export {};
```

### React

```tsx
import { useEffect } from 'react';
import 'paymob-pixel'; // registers window.Pixel

export function Checkout() {
  useEffect(() => {
    new window.Pixel({
      publicKey: 'are_pk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      clientSecret: 'are_csk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      paymentMethods: ['card', 'google-pay', 'apple-pay'],
      elementId: 'paymob-checkout',
    });
  }, []);

  return <div id="paymob-checkout" />;
}
```

### Angular

Add `import 'paymob-pixel';` (or the CDN `<script>` in `index.html`), then
initialise the SDK after the view is ready:

```ts
import { Component, AfterViewInit } from '@angular/core';
import 'paymob-pixel'; // registers window.Pixel

@Component({
  selector: 'app-checkout',
  template: '<div id="paymob-checkout"></div>',
})
export class CheckoutComponent implements AfterViewInit {
  ngAfterViewInit(): void {
    new (window as any).Pixel({
      publicKey: 'are_pk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      clientSecret: 'are_csk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      paymentMethods: ['card', 'google-pay', 'apple-pay'],
      elementId: 'paymob-checkout',
    });
  }
}
```

### Vue 3

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import 'paymob-pixel'; // registers window.Pixel

onMounted(() => {
  new window.Pixel({
    publicKey: 'are_pk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    clientSecret: 'are_csk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    paymentMethods: ['card', 'google-pay', 'apple-pay'],
    elementId: 'paymob-checkout',
  });
});
</script>

<template>
  <div id="paymob-checkout"></div>
</template>
```

&nbsp;

---

&nbsp;

# `Pixel Tokenization`
Use Pixel SDK for only card tokenization.

## Installing

### CDN

Using jsDelivr:

```html
<script src="https://cdn.jsdelivr.net/npm/paymob-pixel@latest/main.js" type="module"></script>
```

## Usage

```js
new Pixel({
    publicKey: 'are_pk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    elementId: 'example',
    supportedNetworks: ['visa', 'mada']
});
```
## Properties

The full list of properties is as follows:
| Property  | Type | Definition |
| --------------------- | --------------  | --------------  |
| publicKey             | String          | It can be accessed from Merchant’s Dashboard → Settings → Account Info. |
| elementId             | String          | ID of the HTML element where the checkout pixel will be embedded. |
| supportedNetworks     | Array           | List of Supported networks. |
| hideCardHolderName    | Boolean         | If this option is set to false, will hide the card holder name input. |
| cardValidationChanged | Function        | This Functionality will be processed whenever card validation status changed.|
| customStyle           | Object          | You can pass custom styles, for more details check the full example below.

## Functions
The full list of functions is as follows:
| Function  | Props | Definition |
| --------------------- | --------------  | --------------  |
| submit                | elementId       | Submit the card data and return the tokenized card.

## Submit Example
> Use to fire the tokenization request and get the tokenized card data.
> ```js
> const response = await Pixel.submit();
> ```
> **submit** will return the response of the tokenization request .
>
>> **Note**: In case you have multiple instance of Pixel within the same page, you have to pass the **elementId** to **submit**
>> ```js
>> const response = await Pixel.submit("example");
>> ```
>

## Full Example

```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="utf-8" />
  <title>Pixel Tokenization</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>

<body>
    <div id="example"></div>
    <button id="btn-submit">Submit</button>
    <script src="https://cdn.jsdelivr.net/npm/paymob-pixel@latest/main.js" type="module"></script>
    <script>
      onload = (event) => {
        new Pixel({
          publicKey: 'are_pk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          elementId: 'example',
          supportedNetworks: ['visa', 'mada'],
          cardValidationChanged: (isValid) => {
            console.log("Is valid ? ", isValid)
          },
          customStyle: {
            HideCardIcons: true,
            HideCardLabel: true,
            Direction: 'rtl',
            Label_Text: {
              cardLabel: "بيانات البطاقة",
              savedCardsLabel: 'البطاقات المحفوطة',
              saveCardConsentLabel: 'حفظ البطاقة',
              cardEndingLabel: 'تنتهي بـ'
            },
            Placeholder_Text: {
              holderName: 'الاسم علي البطاقة',
              cardNumber:'رقم البطاقة',
              expiryDate:'سنة / شهر',
              securityCode:'(CVV) الرمز الامني'
            },
            Error_Text: {
              holderName: 'مطلوب اسم حامل البطاقة',
              cardNumber: {
                required: 'مطلوب رقم البطاقة',
                invalid: 'رقم البطاقة غير صحيح'
              },
              expiryDate: {
                required: 'مطلوب تاريخ انتهاء الصلاحية',
                invalid: 'تاريخ انتهاء الصلاحية غير صحيح'
              },
            },
            Button_Text: {
              viewSavedCardsBtn: 'عرض البطاقات المحفوظة',
              addNewCardBtn: 'إضافة بطاقة جديدة',
              payBtn: 'ادفع'
            },
            Hint_Text: {
              saveCardConsentHint: 'سيتم حفظ تفاصيل البطاقة لاستخدامها في المستقبل.',
              cvvModalTitle: 'رمز CVV',
              cvvVisaMastercardQuestion: 'هل لديك بطاقة ماستركارد أو فيزا؟',
              cvvVisaMastercardHint:
                'هو رمز مكون من 3 أرقام موجود على ظهر البطاقة.',
              cvvAmexQuestion: 'هل لديك بطاقة أمريكان إكسبريس؟',
              cvvAmexHint:
                'هو رمز مكون من 4 أرقام موجود في الجهة الأمامية فوق رقم البطاقة.',
            },
            Font_Family: 'monospace',
            Font_Size_Label: '18',
            Font_Size_Input_Fields: '18',
            Font_Size_Payment_Button: '28',
            Font_Weight_Label: 400,
            Font_Weight_Input_Fields: 400,
            Font_Weight_Payment_Button: 900,
            Color_Container: '#b7ffe4',
            Color_Border_Input_Fields: '#f00',
            Color_Border_Payment_Button: '#f00',
            Radius_Border: '50',
            Color_Disabled: '#c153bf',
            Color_Error: '#4a6',
            Color_Primary: '#c153bf',
            Color_Input_Fields: 'yellow',
            Text_Color_For_Label: '#f00',
            Text_Color_For_Payment_Button: '#f00',
            Text_Color_For_Input_Fields: '#f00',
            Color_For_Text_Placeholder: '#c153bf',
            Width_of_Container: '100%',
            Vertical_Padding: '50',
            Vertical_Spacing_between_components: '8',
            Container_Padding: '50'
          }
        })
        // Submit Call
        const submitBtn = document.getElementById('btn-submit');
        submitBtn.addEventListener('click', async () => {
          try {
            const response = await Pixel.submit();
            console.log("Response:", response.data)

          } catch (error) {
            console.log("Error:", error)

          }
        })
      };
    </script>
</body>

</html>
```
