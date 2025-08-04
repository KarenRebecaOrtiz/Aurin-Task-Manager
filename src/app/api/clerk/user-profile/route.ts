import { auth, currentUser } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener información del usuario desde Clerk usando currentUser()
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Obtener sesiones reales usando el Backend SDK
    let activeDevices = [];
    try {
      // Usar el método correcto según la documentación de Clerk
      console.log('[API] Attempting to get sessions for user:', userId);
      
      // Verificar qué métodos están disponibles
      console.log('[API] Available methods on clerkClient:', Object.keys(clerkClient || {}));
      
      const user = await clerkClient.users.getUser(userId);
      console.log('[API] User retrieved:', !!user);
      
      const sessions = await user.getSessions();
      console.log('[API] Sessions retrieved:', sessions.length);

      activeDevices = sessions.map(session => {
        const activity = session.latestActivity;
        return {
          id: session.id,
          deviceName: getDeviceName(activity?.deviceType),
          browser: getBrowserInfo(activity?.browserName, activity?.browserVersion),
          ipAddress: activity?.ipAddress || 'IP desconocida',
          location: getLocationInfo(activity?.city, activity?.country),
          lastActive: session.lastActiveAt ? new Date(session.lastActiveAt).toLocaleString('es-MX') : 'Desconocido',
          isCurrent: session.id === user.lastActiveSessionId,
          deviceType: getDeviceType(activity?.deviceType),
          userAgent: activity?.deviceType || ''
        };
      });
    } catch (sessionError) {
      console.warn('[API] Error getting sessions:', sessionError);
      // Si no podemos obtener sesiones, al menos mostrar información básica del usuario
      activeDevices = [];
    }

    const userProfileData = {
      user: {
        id: user.id,
        email: user.emailAddresses?.[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        imageUrl: user.imageUrl,
        createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
        updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : null
      },
      activeDevices,
      hasPassword: user.passwordEnabled || false,
      twoFactorEnabled: user.twoFactorEnabled || false
    };

    return NextResponse.json(userProfileData);
  } catch (error) {
    console.error('[API] Error getting user profile data:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

function getDeviceType(deviceType?: string): 'desktop' | 'mobile' | 'tablet' {
  if (!deviceType) return 'desktop';
  
  const type = deviceType.toLowerCase();
  
  if (type === 'mobile') {
    return 'mobile';
  } else if (type === 'tablet') {
    return 'tablet';
  }
  
  return 'desktop';
}

function getDeviceName(deviceType?: string): string {
  if (!deviceType) return 'Dispositivo';
  
  const type = deviceType.toLowerCase();
  
  switch (type) {
    case 'desktop':
      return 'Desktop';
    case 'mobile':
      return 'Mobile';
    case 'tablet':
      return 'Tablet';
    default:
      return 'Dispositivo';
  }
}

function getBrowserInfo(browserName?: string, browserVersion?: string): string {
  if (!browserName) {
    return 'Navegador';
  }
  
  if (browserVersion) {
    return `${browserName} ${browserVersion}`;
  }
  
  return browserName;
}

function getLocationInfo(city?: string, country?: string): string {
  if (city && country) {
    return `${city}, ${country}`;
  } else if (city) {
    return city;
  } else if (country) {
    return country;
  }
  
  return 'Ubicación desconocida';
}

 