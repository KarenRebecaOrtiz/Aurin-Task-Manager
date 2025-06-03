// src/app/(auth)/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs';
import styles from './SignIn.module.scss';
import { Backend } from 'firebase/ai';

export default function SignInPage() {
  return (
    <div className={styles.container}>
      <div className={styles.leftColumn}>
      </div>
      <div className={styles.rightColumn}>
        <SignIn

          appearance={{
            elements: {
              formButtonPrimary: {
                fontSize: 18,
                textTransform: 'none',
                border: '1px solid #d3df48',
                color: '#121212',
                backgroundColor: '#d3df48',
                '&:hover, &:focus, &:active': {
                  backgroundColor: '#ffffff',
                },
              },

              input: {
                color: '#ffffff',
                backgroundColor: '#121212',
                fontSize: '14px',
              },
              inputPlaceholder: {
                color: '#999999', 
              },

              card: {     
                backgroundColor: '#121212',
              },

              logoBox: {     
                borderRadius: '100px',
              },

              headerTitle: {     
                color: 'white',
              },

              socialButtonsBlockButtonText: {
                color: 'white',
              },

              dividerLine: {
                backgroundColor: '#ffffff40',
              },
              formFieldLabel: {
                color: 'white',
              },
              formFieldInput:{
                backgroundColor: '#121212',
                border: '1px solid ffffff40'
              },
              footer: {
                background: '#121212',
              },
              footerActionLink: {
                color: 'white',
              },
              logoImage: {
                borderRadius:'100px',
              },
              providerIcon__apple: {
                filter: 'invert(100)'
              }

              
            },
          }}

          routing='path'
          path='/sign-in'
          signUpUrl='/sign-up'
          fallbackRedirectUrl='/dashboard/tasks'
        />
      </div>
    </div>
  );
}
