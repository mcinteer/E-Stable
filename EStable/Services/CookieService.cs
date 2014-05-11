using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using EStable.Constants;

namespace EStable.Services
{
    public class CookieService : Controller
    {
        public NameValueCollection GetCookie(string cookieName)
        {
            var cookie = new NameValueCollection();
            // We need to perform this check first, to avoid null exception
            // if cookie not exists
            if (Request.Cookies[cookieName] != null)
                cookie = Request.Cookies[cookieName].Values;
            return cookie;
        }
    }
}