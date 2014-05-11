using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Web;
using System.Web.Mvc;
using EStable.Constants;
using EStable.Models;
using EStable.Principle;
using EStable.Services;

namespace EStable.Controllers
{
    public class AccountController : Controller
    {
        private readonly UserOfStableService _userOfStableService = new UserOfStableService();
        private readonly CookieService _cookieService = new CookieService();
        private readonly AuthenticationService _authenticationService = new AuthenticationService();

        public ActionResult LogOff()
        {
            if (Request.Cookies[Codes.Cookies.Login.Key] != null)
            {
                var loginCookie = new HttpCookie(Codes.Cookies.Login.Key);
                loginCookie.Expires = DateTime.Now.AddDays(-1d);
                loginCookie[Codes.Cookies.Login.LastVisit] = DateTime.Now.AddDays(-1d).ToString();
                Request.Cookies.Add(loginCookie);
            }
            return View("GetLoginForm");
        }

        public ActionResult GetRegisterUserOfStableForm()
        {
            return View();
        }

        public ActionResult GetLoginForm()
        {
            return View();
        }

        private void AuthenticateUserOfStable(UserOfStablePortal userOfStable, Stable stable, StableUser user)
        {
            Thread.CurrentPrincipal = new UserOfStablePrinciple(userOfStable, stable, user);
            SaveLoginCookie(Codes.UserType.Stable, userOfStable.UserId);
        }


        public bool IsAuthenticated()
        {
            var loginCookie = Request.Cookies[Codes.Cookies.Login.Key];
            return loginCookie != null && _authenticationService.IsAuthenticated(loginCookie);
        }

        public void SaveLoginCookie(string userType, int userId)
        {
            if (Request.Browser.Cookies)
            {
                //supports the cookies
                var loginCookie = new HttpCookie(Codes.Cookies.Login.Key);
                loginCookie[Codes.Cookies.Login.UserType] = userType;
                loginCookie[Codes.Cookies.Login.UserId] = userId.ToString();
                loginCookie[Codes.Cookies.Login.LastVisit] = DateTime.Now.ToString();
                Request.Cookies.Add(loginCookie);
            }
            else
            {
                //not supports the cookies
                //redirect user on specific page
                //for this or show messages
            }
        }

        public ActionResult SubmitLoginForm(AccountModel model)
        {
            var user = _userOfStableService.GetUserOfStable(model.Email);
            if (user != null)
            {
                SaveLoginCookie(Codes.UserType.Stable, user.UserId);
            }
            else
            {
                
            }
            return View();
        }
    }
}