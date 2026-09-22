from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import UserProfile

# Guard set to prevent circular signal recursion & database locks
_SYNCING_USERS = set()

@receiver(post_save, sender=UserProfile)
def sync_user_profile_to_auth_user(sender, instance, created, **kwargs):
    """
    When a UserProfile is created/updated, sync to Django auth_user without recursion.
    """
    if not instance.username or instance.username in _SYNCING_USERS:
        return

    _SYNCING_USERS.add(instance.username)
    try:
        django_user = User.objects.filter(username=instance.username).first()
        is_admin = (instance.role == 'admin')

        if not django_user:
            django_user = User(
                username=instance.username,
                email=instance.email or f"{instance.username}@institute.edu",
                first_name=instance.name,
                is_staff=is_admin,
                is_superuser=is_admin,
            )
            if instance.password:
                django_user.set_password(instance.password)
            django_user.save()
        else:
            changed = False
            if django_user.first_name != instance.name:
                django_user.first_name = instance.name
                changed = True
            if instance.email and django_user.email != instance.email:
                django_user.email = instance.email
                changed = True
            if django_user.is_staff != is_admin:
                django_user.is_staff = is_admin
                django_user.is_superuser = is_admin
                changed = True
            if instance.password and not django_user.check_password(instance.password):
                django_user.set_password(instance.password)
                changed = True
            
            if changed:
                django_user.save()
    except Exception as e:
        print(f"[SIGNALS] Error syncing UserProfile to auth_user: {e}")
    finally:
        _SYNCING_USERS.discard(instance.username)


@receiver(post_save, sender=User)
def sync_auth_user_to_user_profile(sender, instance, created, **kwargs):
    """
    When a User is created/updated in Django Admin (auth_user), sync to UserProfile without recursion.
    """
    if not instance.username or instance.username in _SYNCING_USERS:
        return

    _SYNCING_USERS.add(instance.username)
    try:
        profile = UserProfile.objects.filter(username=instance.username).first()
        role = 'admin' if (instance.is_staff or instance.is_superuser) else 'trainer'
        name = instance.get_full_name() or instance.username

        if not profile:
            UserProfile.objects.create(
                id=f"usr_{instance.username}",
                username=instance.username,
                name=name,
                email=instance.email or f"{instance.username}@institute.edu",
                role=role,
                designation='Director / Management' if role == 'admin' else 'Faculty Trainer'
            )
        else:
            if profile.role != role:
                profile.role = role
                profile.save()
    except Exception as e:
        print(f"[SIGNALS] Error syncing auth_user to UserProfile: {e}")
    finally:
        _SYNCING_USERS.discard(instance.username)
