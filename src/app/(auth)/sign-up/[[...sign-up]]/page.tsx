// src/app/(auth)/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs';
import styles from '../../sign-in/[[...sign-in]]/SignIn.module.scss';

export default function SignUpPage() {
  return (
    <div className={styles.container}>
      <div className={styles.leftColumn}>
      </div>
      <div className={styles.rightColumn}>
        <SignUp

        appearance={{
            elements: {
            formButtonPrimary: {
                fontSize: 14,
                textTransform: 'none',
                border: '1px solid #d3df48',
                color: '#121212',
                backgroundColor: '#d3df48',
                '&:hover, &:focus, &:active': {
                backgroundColor: '#ffffff',
                },
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
          path='/sign-up'
          signInUrl='/sign-in'
          fallbackRedirectUrl='/dashboard/tasks'
        />
      </div>
    </div>
  );
}
